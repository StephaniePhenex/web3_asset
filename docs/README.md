# Documentation index

| Document | Description |
|----------|-------------|
| [`DELIVERY_PLAYBOOK.md`](DELIVERY_PLAYBOOK.md) | **Minimal delivery & health:** decision gate, over-engineering score, stack defaults, React render purity, observability floor — mirrored in [`.cursor/rules/delivery-playbook.mdc`](../.cursor/rules/delivery-playbook.mdc) (`alwaysApply`) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | CAP v3.0 design rationale: BullMQ decoupling, write-through cache, dual-write risks, mint idempotency, key management, Realtime/DLQ guidance |
| [`MVP_DEVELOPMENT_PLAN.md`](MVP_DEVELOPMENT_PLAN.md) | Two-week MVP sprint: day-by-day tasks, dependencies, milestones |

Start with **delivery playbook** when changing scope or structure; **architecture** for why and risks; **MVP plan** for scheduling.

**Local dev without a cloud Supabase project:** see [Repository README — Recommended: local Supabase first](../README.md#recommended-local-supabase-first-no-cloud-project-quota).

### Sprint logs

| Log | Sprint day |
|-----|------------|
| [`sprints/day-01-log.md`](sprints/day-01-log.md) | Day 1 — setup, schema, Redis, deferrals |
| [`sprints/day-02-log.md`](sprints/day-02-log.md) | Day 2 — BullMQ mint queue skeleton |
| [`sprints/day-03-log.md`](sprints/day-03-log.md) | Day 3 — Crossmint placeholder webhook, orders, idempotency |
