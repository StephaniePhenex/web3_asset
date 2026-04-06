# Day 3 — Payment webhook → queue (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 3](../MVP_DEVELOPMENT_PLAN.md)

---

## Check: Crossmint SDK / official verifier

**None in repo** — only env placeholder and docs. Implemented **placeholder** verification; swap for Crossmint-documented HMAC/signature when ready.

---

## Delivered

| Item | Notes |
|------|--------|
| `POST /api/webhooks/crossmint` | [`src/app/api/webhooks/crossmint/route.ts`](../../src/app/api/webhooks/crossmint/route.ts) |
| Secret | `CROSSMINT_WEBHOOK_SECRET` via `Authorization: Bearer …` or `X-Webhook-Secret` — [`src/lib/webhook-secret.ts`](../../src/lib/webhook-secret.ts) |
| Orders | Insert `PENDING`; **idempotent** on `payment_id` (pre-check + `23505` handling) |
| Queue | `queue.add('mint', payload, { jobId: 'mint:' + paymentId })` — BullMQ dedupe by job id |
| Rollback | If enqueue fails after insert, **delete** the new order row (avoid paid-without-job until outbox) |
| Supabase admin | [`src/lib/supabase-admin.ts`](../../src/lib/supabase-admin.ts) (service role, server-only) |

---

## Local smoke

1. `articles` must contain `article_id` you send (FK). Seed one row in Studio or SQL if empty.
2. Set `CROSSMINT_WEBHOOK_SECRET=dev-secret` in `.env.local` (match curl).
3. Example:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/webhooks/crossmint \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"pay_test_1","userAddress":"0x1234567890123456789012345678901234567890","articleId":"<existing-article-uuid>"}'
```

4. Run `npm run worker:mint` in another terminal; expect a mint job log.

Duplicate same `paymentId` → `{ "ok": true, "duplicate": true }` without second job.

---

## Follow-ups

- Replace `verifyWebhookSecret` with Crossmint official verification.
- Transactional outbox if enqueue-after-insert failures become frequent in production.
