# Day 5 — Acceptance checklist

**Date:** 2026-04-07  
**Reference:** [MVP_DEVELOPMENT_PLAN.md § Day 5](../MVP_DEVELOPMENT_PLAN.md), [day-05-log.md](day-05-log.md)

## Automated (CI / local)

| Check | Command | Expected |
|-------|---------|----------|
| Unit tests | `npm run test` | All pass |
| Lint | `npm run lint` | No errors |
| Build | `npm run build` | Success |

## Functional (local stack)

| # | Check | How |
|---|--------|-----|
| A | Redis up | `npm run redis:up` → `redis-cli ping` → `PONG` |
| B | Supabase local | `supabase start` → migrations applied; seed optional [`supabase/seed.sql`](../../supabase/seed.sql) |
| C | Env | `.env.local`: `REDIS_URL`, Supabase URL + keys, `CROSSMINT_WEBHOOK_SECRET` if testing webhook |
| D | Mint → cache | `npm run dev` + `npm run worker:mint` → trigger payment webhook or `POST /api/dev/enqueue-mint` with `orderId` path → row in `ownership_cache` with `source=MINT` |
| E | Transfer webhook | `POST /api/webhooks/alchemy` with Bearer secret + body `{ to, tokenId, articleId }` → upsert `source=TRANSFER` |
| F | Reconcile | `MINT_MODE=chain` + real `token_id`: `npm run reconcile:ownership` → no mismatch; `mock-*` token ids skipped |

## Sign-off

Fill when run:

- [x] Automated three commands run on commit: `npm run test` · `npm run lint` · `npm run build` (2026-04-07, all green)
- [ ] At least one path **D** verified on a dev machine (optional if CI-only for the day)

**Result:** Day 5 **accepted** for continuation to Day 7 when automated checks pass and ownership pipeline is understood by the team.
