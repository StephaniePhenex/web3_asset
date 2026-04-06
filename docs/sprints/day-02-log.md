# Day 2 — BullMQ queue skeleton (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 2](../MVP_DEVELOPMENT_PLAN.md)  
**Milestone target:** M2 — enqueue → process → ack is reliable (placeholder mint logic).

---

## Objectives

Job lifecycle before chain logic: `Mint_Task` queue, placeholder worker, repeatable smoke test.

---

## Delivered

| Plan task | Implementation |
|-----------|------------------|
| `Mint_Task` queue + stalled / DLQ-style retention | [`src/lib/queues/mint-queue.ts`](../../src/lib/queues/mint-queue.ts) — queue name `mint-tasks`; **limiter 5 jobs/sec** on [`scripts/mint-worker.ts`](../../scripts/mint-worker.ts) (BullMQ v5); **exponential backoff** (base 2s), **attempts 5**, `removeOnComplete` / `removeOnFail` counts for inspection (BullMQ failed set = operational DLQ surface). |
| Placeholder processor | [`scripts/mint-worker.ts`](../../scripts/mint-worker.ts) — logs payload, returns success. |
| Enqueue smoke | [`scripts/enqueue-mint-smoke.ts`](../../scripts/enqueue-mint-smoke.ts) + dev-only [`POST /api/dev/enqueue-mint`](../../src/app/api/dev/enqueue-mint/route.ts) (development only). |

**Supporting**

- [`src/lib/redis-connection.ts`](../../src/lib/redis-connection.ts) — `createRedisConnection()` per BullMQ recommendation (separate connections for queue vs worker).
- [`src/lib/load-env.ts`](../../src/lib/load-env.ts) — loads `.env.local` for Node scripts.
- [`GET /api/health`](../../src/app/api/health/route.ts) — Redis `PING` (supports M1 “Redis reachable” from running app).

---

## How to run locally

1. **Redis:** `npm run redis:up` (ensure `REDIS_URL` in `.env.local`).
2. **Worker (terminal A):** `npm run worker:mint`
3. **Enqueue (terminal B):** `npm run queue:smoke`  
   or `curl -X POST http://localhost:3000/api/dev/enqueue-mint -H "Content-Type: application/json" -d '{}'`

Expect worker terminal to log `[mint-worker] job ...`.

---

## Milestone M2

| Check | Status |
|-------|--------|
| Job survives Redis restart? | Jobs stored in Redis; **in-flight** behavior depends on `lockDuration` / retry (tune in Day 4). |
| Enqueue → process → ack | **Yes** (placeholder). |

---

## Follow-ups (later days)

- Idempotency key on `payment_id` (Day 3).
- Real `mintTo` + order status updates (Day 4).
- Separate worker process in production (same script or container; not Next.js serverless worker).
