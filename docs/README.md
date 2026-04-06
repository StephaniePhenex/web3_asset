# Documentation index

| Document | Description |
|----------|-------------|
| [`DELIVERY_PLAYBOOK.md`](DELIVERY_PLAYBOOK.md) | **Minimal delivery & health:** decision gate, over-engineering score, stack defaults, React render purity, observability floor — mirrored in [`.cursor/rules/delivery-playbook.mdc`](../.cursor/rules/delivery-playbook.mdc) (`alwaysApply`) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | CAP v3.0 design rationale: BullMQ decoupling, write-through cache, dual-write risks, mint idempotency, key management, Realtime/DLQ guidance |
| [`CONTENT_ENCRYPTION.md`](CONTENT_ENCRYPTION.md) | Day 8: AES-GCM envelope, `ARTICLE_CONTENT_KEY`, MVP stance (Lit / signed URL follow-ups) |
| [`sprints/day-09-log.md`](sprints/day-09-log.md) | Day 9 — article page, Web Crypto decrypt, order status API, canvas |
| [`sprints/day-10-e2e.md`](sprints/day-10-e2e.md) | Day 10 — E2E checklist (pay → mint → cache → UI), edge cases |
| [`sprints/day-10-log.md`](sprints/day-10-log.md) | Day 10 — milestone M5, `npm run e2e:mvp` |
| [`MVP_DEVELOPMENT_PLAN.md`](MVP_DEVELOPMENT_PLAN.md) | Two-week MVP sprint: day-by-day tasks, dependencies, milestones |

Start with **delivery playbook** when changing scope or structure; **architecture** for why and risks; **MVP plan** for scheduling.

**Local dev without a cloud Supabase project:** see [Repository README — Recommended: local Supabase first](../README.md#recommended-local-supabase-first-no-cloud-project-quota).

### Sprint logs

| Log | Sprint day |
|-----|------------|
| [`sprints/day-01-log.md`](sprints/day-01-log.md) | Day 1 — setup, schema, Redis, deferrals |
| [`sprints/day-02-log.md`](sprints/day-02-log.md) | Day 2 — BullMQ mint queue skeleton |
| [`sprints/day-03-log.md`](sprints/day-03-log.md) | Day 3 — Crossmint placeholder webhook, orders, idempotency |
| [`sprints/day-04-log.md`](sprints/day-04-log.md) | Day 4 — Thirdweb mint in worker, order status, mock vs chain |
| [`sprints/day-05-log.md`](sprints/day-05-log.md) | Day 5 — ownership_cache write-through, Alchemy placeholder, reconcile |
| [`sprints/day-05-acceptance.md`](sprints/day-05-acceptance.md) | Day 5 — acceptance checklist (automated + manual) |
| [`sprints/day-07-log.md`](sprints/day-07-log.md) | Day 7 — `POST /api/get-article-content`, wallet signature, cache / ownerOf fallback |
| [`sprints/day-08-log.md`](sprints/day-08-log.md) | Day 8 — AES-GCM envelope, key flags, encrypt CLI |
