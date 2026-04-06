# CAP v3.0 — Senior Web3 Engineer Review Report

**Date:** 2026-04-06
**Scope:** Full codebase review (`src/`, `scripts/`, `supabase/`, `docs/`)
**Verdict:** Solid MVP skeleton with three production-blocking security gaps and one data-integrity flaw that must be resolved before any real funds flow through this system.

---

## 1. What's Well-Architected

**BullMQ queue design is correct.** Separating payment webhook (fast HTTP 2xx ack) from chain work (slow, failure-prone) is the right call. The 5-jobs/sec BullMQ limiter, exponential backoff, DLQ via `maxAttempts`, and idempotency on `payment_id` are all production-grade patterns. The mock/chain mode split via `MINT_MODE` is smart for iterative development.

**Write-through ownership cache is the right UX call.** Read-after-write UX fails badly if you rely on delayed indexer state after a user just paid. The cache-first → `ownerOf` chain fallback in `article-access.ts` is the correct layered approach.

**Schema is clean and intentional.** Three tables, well-typed enums (`order_status`, `ownership_source`), explicit `payment_id` unique constraint. The `ownership_cache` upsert-on-conflict logic is correct for mint-path updates.

**Docs are unusually good for an MVP.** DELIVERY_PLAYBOOK.md + ARCHITECTURE.md are architecturally honest — they name the dual-write risk and outbox pattern explicitly. Most teams skip this entirely.

---

## 2. Critical Issues (Production-Blocking)

### 🔴 Issue 1: Webhook Auth Is a Placeholder — Real Money Path

**File:** `src/app/api/webhooks/crossmint/route.ts`

The current implementation uses a simple Bearer token comparison:
```typescript
if (authHeader !== `Bearer ${secret}`) { return 401 }
```

Crossmint (and any serious payment provider) sends **HMAC-SHA256 signatures** over the raw request body with a timestamp header. Bearer comparison:
- Is trivially forgeable by anyone who intercepts one valid request
- Doesn't protect against replay attacks
- Doesn't bind the signature to the payload content

**Fix required before real payments:**
```typescript
import { createHmac, timingSafeEqual } from "crypto";

const rawBody = await req.text();
const timestamp = req.headers.get("x-crossmint-timestamp");
const signature = req.headers.get("x-crossmint-signature");

const expected = createHmac("sha256", secret)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");

if (!timingSafeEqual(Buffer.from(signature!), Buffer.from(expected))) {
  return new Response("Unauthorized", { status: 401 });
}
// parse body from rawBody after verification
```

Also add timestamp window check (reject if `|now - timestamp| > 5 minutes`) to prevent replays.

---

### 🔴 Issue 2: AES Key Exposed to Browser via `NEXT_PUBLIC_*`

**File:** `src/lib/content-key-source.ts`

```typescript
// Dev-only path in content-key-source.ts
const key = process.env.NEXT_PUBLIC_ARTICLE_CONTENT_KEY;
```

`NEXT_PUBLIC_*` variables are **baked into the client bundle at build time**. Anyone can open DevTools → Application → Sources and read the AES-256-GCM key. This completely breaks content encryption — the entire security model collapses.

**Root issue:** The architecture doc acknowledges this is a placeholder, but there's no concrete path beyond "signed URL or Lit stub." This needs to be resolved before any real content goes in.

**Two viable MVP paths:**

**Option A — Server-side key delivery (simpler):**
The content API (`/api/get-article-content`) verifies wallet ownership, decrypts server-side, and returns plaintext over HTTPS. No key ever leaves the server. Weaker privacy model (server can read content) but simpler and correct.

**Option B — Ephemeral session key (better privacy):**
1. Client signs a challenge (with nonce — see Issue 3)
2. Server verifies ownership, generates a short-lived JWT wrapping the AES key
3. Client derives decryption key from JWT payload in Web Crypto
4. JWT expires in 15 minutes; never stored in localStorage

Do **not** ship with `NEXT_PUBLIC_ARTICLE_CONTENT_KEY` as anything other than a local-dev convenience with a throwaway key.

---

### 🔴 Issue 3: EIP-191 Signature Has No Replay Protection

**File:** `src/lib/wallet-auth.ts`

```typescript
const message = `CAP:article:${articleId}:${walletAddress}`;
```

This message is **static** — identical every time the same wallet accesses the same article. Consequences:
- An attacker who intercepts one signed message can replay it indefinitely
- No expiry, no nonce, no domain binding
- Content API has no way to distinguish a fresh auth from a 6-month-old captured signature

**Fix:**

```typescript
// Server: issue a nonce tied to (wallet, articleId), expires in 5 min
// Store in Redis: `nonce:{walletAddress}:{articleId}` = {value, exp}

// Message includes nonce + expiry:
const message = [
  "CAP Content Access",
  `Article: ${articleId}`,
  `Wallet: ${walletAddress}`,
  `Nonce: ${nonce}`,
  `Expires: ${iso8601Expiry}`,
].join("\n");
```

Two-step flow: `GET /api/auth/nonce?articleId=&wallet=` → sign message → `POST /api/get-article-content` with signature. Server checks nonce exists, is unexpired, then burns it (one-use).

---

## 3. Significant Issues (Pre-Launch)

### 🟡 Issue 4: Ownership Cache Unique Constraint Doesn't Model Transfers Correctly

**File:** `supabase/migrations/` + `src/lib/ownership-cache.ts`

The upsert conflict target is `(article_id, token_id)`. This means when Token #42 transfers from Alice to Bob:
- The upsert updates the row to `owner = Bob` ✓
- But any previous row for Alice with the same token_id is gone ✓

This is actually correct for MINT and TRANSFER paths. **However**, there's an edge case: if Alice somehow has a cached row for Token #42 and there's a separate INSERT for Bob (not an upsert), you get two owners for the same token. The fix is to ensure all writes go through the upsert path — and to add a DB-level constraint confirming one owner per token_id:

```sql
ALTER TABLE ownership_cache
  ADD CONSTRAINT one_owner_per_token UNIQUE (token_id);
```

Then the upsert `ON CONFLICT (token_id) DO UPDATE SET owner_address = EXCLUDED.owner_address` cleanly handles transfers.

**Also:** The reconciliation script (`scripts/reconcile-ownership.ts`) skips `mock-*` token IDs, which is fine for dev. But it needs rate limiting on the `ownerOf` RPC calls for production with many tokens — currently fires calls in a tight loop.

---

### 🟡 Issue 5: Dual-Write Risk Is Acknowledged But Not Mitigated in Code

**File:** `src/app/api/webhooks/crossmint/route.ts`

The ARCHITECTURE.md correctly identifies this risk. The current code does:

```typescript
// 1. Upsert orders (Postgres)
// 2. Enqueue to BullMQ (Redis)
// 3. If enqueue fails, delete the order row (attempted rollback)
```

The "delete on enqueue failure" rollback is unreliable — the delete can also fail, leaving an orphaned PENDING order with no job. The minimum viable fix from the playbook is already specified: keep `orders.status` retryable and add a sweeper.

**Minimum fix for MVP:**
```typescript
// Don't delete on enqueue failure — leave PENDING
// Add a sweeper that re-enqueues PENDING orders older than 2 minutes with no active job
// This is idempotent via payment_id
```

A cron job or BullMQ repeat job that scans `WHERE status = 'PENDING' AND created_at < now() - interval '2 minutes'` and re-enqueues is ~20 lines and eliminates the gap.

---

### 🟡 Issue 6: Worker Has No Signer Nonce Management

**File:** `scripts/mint-worker.ts` + `src/lib/mint-onchain.ts`

`concurrency: 1` on the BullMQ worker is the right call to avoid nonce collisions (only one transaction in-flight at a time from the hot wallet). However:
- There's no nonce pre-fetch or locking mechanism
- If the worker restarts mid-transaction, the nonce state isn't recovered
- In `MINT_MODE=chain`, Thirdweb's SDK manages nonces internally, which may auto-increment even on failed transactions, potentially causing stuck nonces

**Recommendation:** For the MVP single-wallet setup, `concurrency: 1` is sufficient, but add explicit nonce tracking:
```typescript
// After successful tx:
// Log tx.nonce in orders table alongside tx_hash
// On worker restart, check pending PROCESSING orders and their nonces before continuing
```

---

## 4. Minor Issues

**`src/app/api/dev/enqueue-mint/route.ts`** — The dev-only enqueue endpoint should be gated with `process.env.NODE_ENV !== 'production'` at runtime, not just as a convention. A misdeployment could expose an unauthenticated mint trigger in production.

**Canvas copy protection** — Canvas-based text rendering prevents right-click copy but doesn't prevent screenshot → OCR. This is acceptable friction for MVP but should be documented as "friction, not DRM" to set stakeholder expectations correctly.

**`THIRDWEB_PRIVATE_KEY` in env** — Noted in docs as production risk. For MVP testnet this is fine; for mainnet, a basic AWS Secrets Manager or even KMS-wrapped key is required. The private key is the entire security boundary for the hot wallet.

**Alchemy webhook secret** — `src/app/api/webhooks/alchemy/route.ts` uses the same placeholder Bearer pattern as Crossmint. Alchemy sends HMAC-SHA256 signatures; apply the same fix.

---

## 5. Prioritized Action List

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 P0 | HMAC-SHA256 webhook verification (Crossmint + Alchemy) | ~1 day |
| 🔴 P0 | Remove `NEXT_PUBLIC_ARTICLE_CONTENT_KEY`; implement server-side key delivery or ephemeral JWT | ~1-2 days |
| 🔴 P0 | EIP-191 nonce + expiry (replay protection) | ~0.5 day |
| 🟡 P1 | Dual-write sweeper (re-enqueue stuck PENDING orders) | ~0.5 day |
| 🟡 P1 | `ownership_cache` one-owner-per-token constraint | ~1 hour |
| 🟡 P2 | Dev enqueue endpoint production guard | ~10 min |
| 🟡 P2 | Reconciliation script RPC rate limiting | ~0.5 day |
| ⚪ P3 | Nonce tracking in orders table for signer recovery | ~0.5 day |

---

## 6. Overall Assessment

The architecture choices are sound. The decision to use BullMQ (not direct mint from webhook), write-through cache (not pure chain reads), and cache-first gating (not pure RPC) all reflect production Web3 experience. The docs are notably good — the team clearly understands the risks.

**The gap is implementation maturity on the security surface.** All three P0 issues are well-understood patterns that were intentionally deferred as placeholders. The system is correctly labeled "MVP" but should not process real mainnet payments until P0s are resolved — not because the architecture is wrong, but because the authentication layer is currently symbolic.

Fix the three P0s (~3 days of work), add the sweeper, and this is a shippable testnet demo. The architecture doesn't need to change — the skeleton is right.
