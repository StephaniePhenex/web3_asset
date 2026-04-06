# Day 7 — Content access API (NFT gate)

**Date:** 2026-04-07  
**Reference:** [MVP_DEVELOPMENT_PLAN.md § Day 7](../MVP_DEVELOPMENT_PLAN.md)

## Delivered

| Item | Location |
|------|----------|
| EIP-191 wallet proof | `src/lib/wallet-auth.ts` — message `CAP:article:{articleId}:{address}` |
| Ownership resolution | `src/lib/article-access.ts` — `ownership_cache` first; else `orders` (COMPLETED, same `user_address`) + `ownerOf` + `upsertOwnershipFromSync` |
| HTTP API | `POST /api/get-article-content` — body `{ articleId, address, signature }`; returns `{ articleId, title, encryptionFormat, encryptedContent }` (Day 8: v1 envelope vs legacy) |
| GET | `405` with hint to use POST |

## Security notes

- Response is ciphertext (`encrypted_content`); do not log payload bodies in production.
- `CHAIN_RPC_URL` + `NFT_CONTRACT_ADDRESS` required for order+chain fallback; mock `token_id` values are skipped.

## Related

- Day 5 cache: `src/lib/ownership-cache.ts` (`upsertOwnershipFromSync`)
- Day 8: see [`day-08-log.md`](day-08-log.md) — `encryptionFormat` + AES-GCM envelope in `encryptedContent`
