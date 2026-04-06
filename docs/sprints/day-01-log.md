# Day 1 — Project setup & architecture (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 1](../MVP_DEVELOPMENT_PLAN.md)  
**Milestone target:** M1 — runnable repo, secrets pattern, DB schema for MVP, Redis for BullMQ.

---

## Objectives (from plan)

Runnable repo, secrets pattern, database matching MVP, Redis available locally.

---

## Task checklist

| Plan task | Status | Evidence / notes |
|-----------|--------|------------------|
| Scaffold monorepo (`apps/web`, `apps/api`, …) | **Deferred** | Single Next.js app in repo root matches MVP delivery playbook (no second consumer of `packages/types` yet). Split when a second deployable surface needs shared types. **Trigger:** second service or shared SDK consumers ≥2. |
| Supabase: `articles`, `orders`, `ownership_cache` + indexes | **Done** | [`supabase/migrations/20250405120000_initial_cap_schema.sql`](../../supabase/migrations/20250405120000_initial_cap_schema.sql) — enums, FKs, `payment_id` unique, indexes on `owner_address` and supporting columns. |
| RLS stub (service role server-side) | **Not done** | No RLS policies in initial migration. **Decision:** server-only access via `SUPABASE_SERVICE_ROLE_KEY` until client-side anon reads are required. **Trigger:** expose Supabase client to browser with anon key for direct table access. |
| Migrations apply locally | **Done** | Applied via `supabase start` (local stack); ports adjusted in `supabase/config.toml` when default ports conflict with another local project. |
| Redis (Docker Compose) | **Done** | [`docker-compose.yml`](../../docker-compose.yml), scripts `npm run redis:up` / `redis:down`. |
| `.env.example` | **Done** | Supabase, Redis, Thirdweb, Crossmint placeholders. |
| Cloud Supabase project | **Deferred** | Free tier project limit reached; **local-first** per team decision. **Trigger:** spare free slot, paid org, or deploy to staging/prod. |
| CI (lint/test) | **Done (Day 3)** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — `npm ci`, lint, test, build on push/PR. |

---

## Milestone M1 assessment

| Criterion | Status |
|-----------|--------|
| Repo runs (`npm run dev`, `npm run build`) | **Yes** |
| Schema exists as SQL migrations | **Yes** |
| Redis reachable | **Yes** (Compose); optional [`GET /api/health`](../../src/app/api/health/route.ts) checks Redis when server runs |
| App code connects to Supabase | **Partial** | Env vars documented; **Day 1 log closes with health route** — full `createClient` usage can land with first API that reads/writes DB. |

**Conclusion:** Day 1 **accepted for local-first MVP** with explicit deferrals (monorepo, RLS, cloud). CI added in Day 3. Day 2 (BullMQ) depends on **Redis only**, not cloud DB.

---

## Artifacts

| Artifact | Location |
|----------|----------|
| Next.js app | `src/app/` |
| Supabase migrations | `supabase/migrations/` |
| Env template | `.env.example` |
| Local env (gitignored) | `.env.local` (user machine; from `supabase status -o env` when using local stack) |
| Delivery / architecture docs | `docs/DELIVERY_PLAYBOOK.md`, `docs/ARCHITECTURE.md` |

---

## Follow-ups

1. When cloud project available: `supabase link` + `supabase db push`; replace `.env.local` Supabase URL/keys.
2. Add GitHub Action: `npm ci`, `npm run lint`, `npm run build`.
3. Add RLS + policies when anon client accesses tables from the browser.
