# Day 9 — Frontend MVP (Canvas, badge, mint states)

**Date:** 2026-04-07  
**Reference:** [MVP_DEVELOPMENT_PLAN.md § Day 9](../MVP_DEVELOPMENT_PLAN.md)

## Delivered

| Item | Location |
|------|----------|
| Article page | `/article/[articleId]` — `ArticleClient.tsx` (wallet, sign, canvas) |
| Web Crypto decrypt | `src/lib/webcrypto-decrypt.ts` — AES-GCM v1, matches Node `article-crypto` |
| Shared ciphertext types | `src/lib/article-ciphertext-types.ts`, `article-envelope.ts` (no Node `crypto` in client imports) |
| Order + token badge | `POST /api/article-order-status` — latest `orders` row + `ownership_cache` `displayTokenId` |
| Mint pending UX | Spinner when `PENDING` / `PROCESSING`; copy for `FAILED` |
| Canvas friction | `user-select: none`, `contextmenu` preventDefault |
| Home link | `/` → demo article UUID |

## Env (local decrypt)

Set **`NEXT_PUBLIC_ARTICLE_CONTENT_KEY`** to the same 64-hex value as **`ARTICLE_CONTENT_KEY`** (dev-only; never ship a global content key to production clients — use Lit / wrapped keys later).

## Follow-ups

- Day 10: E2E checklist with real pay → mint path
- Production: remove `NEXT_PUBLIC_*` content key; add nonce/replay hardening (Day 12)
