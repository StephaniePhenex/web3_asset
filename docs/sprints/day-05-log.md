# Day 5 — Ownership cache + Alchemy (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 5](../MVP_DEVELOPMENT_PLAN.md)

---

## Delivered

| Task | Implementation |
|------|------------------|
| Write-through after mint | [`upsertOwnershipFromMint`](../../src/lib/ownership-cache.ts) called from [`scripts/mint-worker.ts`](../../scripts/mint-worker.ts) after successful mint + order update |
| Transfer / secondary | [`POST /api/webhooks/alchemy`](../../src/app/api/webhooks/alchemy/route.ts) — placeholder Bearer secret; [`parseTransferWebhookBody`](../../src/lib/alchemy-transfer-payload.ts); `upsertOwnershipFromTransfer` |
| Reconciliation | [`scripts/reconcile-ownership-cache.ts`](../../scripts/reconcile-ownership-cache.ts) — `ownerOf` vs cache; skips `mock-*` token ids |
| Single-article MVP | `MVP_DEFAULT_ARTICLE_ID` when webhook omits `articleId` |

---

## Environment

| Variable | Role |
|----------|------|
| `ALCHEMY_WEBHOOK_SECRET` | Placeholder auth (same header style as Crossmint webhook) |
| `MVP_DEFAULT_ARTICLE_ID` | Fallback `article_id` for Transfer webhook when body has no `articleId` |
| `CHAIN_RPC_URL` / `NFT_CONTRACT_ADDRESS` | Used by `npm run reconcile:ownership` |

Official Alchemy Notify signing should replace `verifyWebhookSecret` when keys are ready.

---

## Commands

```bash
npm run reconcile:ownership
```

Local Transfer test (with secret + default article in `.env.local`):

```bash
curl -sS -X POST http://127.0.0.1:3000/api/webhooks/alchemy \
  -H "Authorization: Bearer $ALCHEMY_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"0x...","tokenId":"1"}'
```

---

## Milestone M4

Mint path updates `ownership_cache` with `source=MINT`; Transfer webhook updates same `(article_id, token_id)` row with new owner and `source=TRANSFER`.
