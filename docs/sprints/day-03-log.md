# Day 3 — Payment webhook → queue (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 3](../MVP_DEVELOPMENT_PLAN.md)

**Local-first env:** [`README.md` § Recommended: local Supabase first](../../README.md#recommended-local-supabase-first-no-cloud-project-quota) — `supabase start` + `.env.local` from `supabase status -o env`; Crossmint secret can wait (use dev enqueue / `queue:smoke` until then).

---

## Check: Crossmint SDK / official verifier

**None in repo** — only env placeholder and docs. Implemented **placeholder** verification; swap for Crossmint-documented HMAC/signature when ready.

---

## Delivered

| Item | Notes |
|------|--------|
| `POST /api/webhooks/crossmint` | [`src/app/api/webhooks/crossmint/route.ts`](../../src/app/api/webhooks/crossmint/route.ts) |
| Secret | `CROSSMINT_WEBHOOK_SECRET` via `Authorization: Bearer …` or `X-Webhook-Secret` — [`src/lib/webhook-secret.ts`](../../src/lib/webhook-secret.ts) |
| Body | **camelCase or snake_case** — [`src/lib/crossmint-payload.ts`](../../src/lib/crossmint-payload.ts) |
| Orders | Insert `PENDING`; **idempotent** on `payment_id` (pre-check + `23505` handling) |
| Queue | `queue.add('mint', payload, { jobId: 'mint:' + paymentId })` — BullMQ dedupe by job id |
| Rollback | If enqueue fails after insert, **delete** the new order row (avoid paid-without-job until outbox) |
| Supabase admin | [`src/lib/supabase-admin.ts`](../../src/lib/supabase-admin.ts) (service role, server-only) |
| Mock / unit tests | `npm run test` — Vitest for `webhook-secret` + `crossmint-payload` ([`vitest.config.ts`](../../vitest.config.ts)) |
| CI | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — lint, test, build |
| Dev seed (optional) | [`supabase/seed.sql`](../../supabase/seed.sql) — fixed article id `11111111-1111-4111-8111-111111111111` (run in Studio or enable `[db.seed]` + `db reset`) |

**Day 3 plan closure:** webhook + secret + orders + idempotent enqueue + **automated tests + CI** (per MVP plan “Mock webhook tests / CI green”).

---

## Local smoke

1. Ensure one `articles` row exists — run [`supabase/seed.sql`](../../supabase/seed.sql) in Studio SQL, or use id `11111111-1111-4111-8111-111111111111`.
2. Set `CROSSMINT_WEBHOOK_SECRET=dev-secret` in `.env.local` (match curl).
3. Example:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/webhooks/crossmint \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"pay_test_1","userAddress":"0x1234567890123456789012345678901234567890","articleId":"11111111-1111-4111-8111-111111111111"}'
```

4. Run `npm run worker:mint` in another terminal; expect a mint job log.

Duplicate same `paymentId` → `{ "ok": true, "duplicate": true }` without second job.

---

## Follow-ups

- Replace `verifyWebhookSecret` with Crossmint official verification.
- Transactional outbox if enqueue-after-insert failures become frequent in production.
