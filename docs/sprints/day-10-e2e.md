# Day 10 — End-to-end integration (MVP one-article path)

**Reference:** [MVP_DEVELOPMENT_PLAN.md § Day 10](../MVP_DEVELOPMENT_PLAN.md) · Milestone **M5**

**Goal:** Repeatable checklist: **pay (webhook) → queue → mint → ownership_cache → gated API → decrypt → Canvas**.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Node 20+, `npm install` | |
| **Redis** | `npm run redis:up` → `REDIS_URL=redis://127.0.0.1:6379` |
| **Supabase** | Local or hosted; migrations applied; optional [`supabase/seed.sql`](../../supabase/seed.sql) for demo article `11111111-1111-4111-8111-111111111111` |
| **`.env.local`** | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CROSSMINT_WEBHOOK_SECRET`, `REDIS_URL`; for UI decrypt also `ARTICLE_CONTENT_KEY` + **`NEXT_PUBLIC_ARTICLE_CONTENT_KEY`** (same 64 hex, dev-only) |

---

## Automated gate (no chain, no browser)

From repo root:

```bash
npm run e2e:mvp
```

Runs unit tests + ESLint. Optionally:

- **`E2E_WITH_BUILD=1 npm run e2e:mvp`** — includes `next build`.
- Terminal A: `npm run dev`. Terminal B: `E2E_BASE_URL=http://127.0.0.1:3000 npm run e2e:mvp` — also `GET /api/health` (Redis ping).

---

## Manual E2E — mock mint (default `MINT_MODE=mock`)

Use a **unique** `paymentId` per run (e.g. `pay_e2e_<timestamp>`).

### 1) Start processes (three terminals)

1. **Redis** (if not already): `npm run redis:up`
2. **Next.js:** `npm run dev`
3. **Mint worker:** `npm run worker:mint`

### 2) Trigger payment webhook

```bash
export SECRET="dev-e2e-secret"   # must match CROSSMINT_WEBHOOK_SECRET in .env.local
export PAY="pay_e2e_$(date +%s)"
curl -sS -X POST http://127.0.0.1:3000/api/webhooks/crossmint \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"paymentId\":\"$PAY\",\"userAddress\":\"0x1111111111111111111111111111111111111111\",\"articleId\":\"11111111-1111-4111-8111-111111111111\"}"
```

**Expect:** `200` with `ok`, `orderId`, `enqueued: true`.

### 3) Observe worker

Worker terminal should log `[mint-worker] completed` with `MINT_MODE=mock` and a **`mock-…`** `tokenId`.

### 4) Verify persistence (Supabase Studio or SQL)

| Check | Expected |
|-------|----------|
| `orders` row for `payment_id = $PAY` | `status = COMPLETED`, `token_id` like `mock-…`, `tx_hash` set |
| `ownership_cache` | Row for same `article_id`, `owner_address` = buyer, `source = MINT` |

### 5) Article API + UI

1. Open **`/article/11111111-1111-4111-8111-111111111111`** with the **same wallet** as `userAddress` in the webhook (MetaMask account switch if needed).
2. **Connect → Sign & load content.**
3. **Expect:** Title loads; if `NEXT_PUBLIC_ARTICLE_CONTENT_KEY` matches server key, **plaintext on Canvas**; badge shows **token #** when `displayTokenId` is present.

**Note:** EIP-1193 wallets use the connected account; the demo address `0x1111…1111` must be the active signer for the signature to match `orders` / `ownership_cache`.

---

## Optional — testnet mint (`MINT_MODE=chain`)

Requires `CHAIN_RPC_URL`, `NFT_CONTRACT_ADDRESS`, `THIRDWEB_PRIVATE_KEY`, and a deployed collection. Same checklist as above; worker logs real `txHash` / `tokenId`; reconcile script can validate `ownerOf` vs cache.

---

## Edge cases (documented behavior)

### Duplicate webhook (same `payment_id`)

- Second `POST` returns **`duplicate: true`** (no second order insert).
- BullMQ job id **`mint:${paymentId}`** dedupes: replays should not enqueue a second job with the same id.

**Verify:** Send the same curl twice; second response includes `duplicate: true`.

### Slow RPC / transient chain errors

- Worker uses BullMQ **retries** (`attempts` on jobs; exponential backoff per BullMQ defaults in [`mint-queue`](../../src/lib/queues/mint-queue.ts)).
- If all attempts fail, order moves to **`FAILED`** with `failure_reason` (see [`scripts/mint-worker.ts`](../../scripts/mint-worker.ts) `worker.on("failed")`).

**Operational note:** Watch worker logs and DLQ depth before go-live (Day 11).

### Transfer before first UI load / secondary buyer

- **Primary:** After mint, `ownership_cache` should be written before the user opens the article; if not (race), first `POST /api/get-article-content` may **403** until cache is consistent or **`ownerOf`** fallback succeeds (see [`article-access.ts`](../../src/lib/article-access.ts)).
- **Secondary:** Buyer not in `orders` must appear in **`ownership_cache`** via Alchemy **`POST /api/webhooks/alchemy`** (Transfer) or **`npm run reconcile:ownership`**.

**Verify:** After a mock mint, reload the article page; entitlement should succeed once cache row exists.

---

## Sign-off (fill when demo passes)

| Step | Pass |
|------|------|
| `npm run e2e:mvp` | ☐ |
| Webhook → worker → `orders.COMPLETED` + `ownership_cache` (mock) | ☐ |
| Article page: sign → decrypt → Canvas (with `NEXT_PUBLIC_ARTICLE_CONTENT_KEY`) | ☐ |
| Duplicate `paymentId` smoke | ☐ |

**M5:** MVP feature-complete for **one article** when the rows above are checked for your environment.
