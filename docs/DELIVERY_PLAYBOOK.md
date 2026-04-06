# Delivery playbook (minimal delivery & health)

This repo adopts **Minimal Delivery & Health** guardrails: avoid over-engineering, ship the smallest fix that works, and keep UI render paths pure. The generic rules live in the Cursor skill `minimal-delivery-health`; **this file is the stack-specific playbook** for CAP v3.0 / `web3_asset`.

**Cursor:** the same rules are enforced as an always-on workspace rule in [`.cursor/rules/delivery-playbook.mdc`](../.cursor/rules/delivery-playbook.mdc) (`alwaysApply: true`). Edit that file if you change global delivery policy.

---

## 1. Decision gate (before new abstractions)

Before adding layers, services, queues, or infra, answer:

1. **What concrete problem exists today?**
2. **What evidence proves it?** (bug, metric, p95, failed job rate)
3. **What is the smallest possible fix?**

**Hard rules**

- Cannot answer all three → do not proceed.
- Problem is hypothetical → defer; document a **trigger** in backlog (see §6).
- Fix is not the smallest → simplify first.

---

## 2. Over-engineering score (quick check)

Rate each 0 / 1 / 2 (max 12). Sum:

| Signal | Question |
|--------|----------|
| No evidence | Real pain today? |
| Hypothetical future | “Maybe someday”? |
| Flexibility tax | Abstraction without second use case? |
| Boil the ocean | Multiple future problems in one PR? |
| Clever over clear | Harder to read for elegance? |
| Regression risk | More failure modes or latency? |

| Total | Action |
|-------|--------|
| 0–2 | Safe to proceed |
| 3–5 | Caution: justify why not smaller; name a validation metric |
| 6–8 | High risk: smaller alternative or split into steps |
| 9–12 | Block: document trigger for revisit only |

**Tie-break:** fewer moving parts, easier rollback.

---

## 3. Defaults for this stack (bias)

Unless evidence says otherwise:

| Default | For this repo |
|---------|----------------|
| Duplication > abstraction | Two similar Route Handlers beat a premature “service layer” with one caller |
| Simple flow > flexible | One article MVP: hardcode article id / feature path until a second article exists |
| Sync > async | Do not add a second queue without measured need |
| Monolith > distributed | Next.js + workers in same repo until team/scale forces split |
| Hardcode > config | Extract env after the **third** repeat |
| Explicit > generic | Named tables and jobs (`Mint_Task`) over generic “event bus” |

**CAP-specific:** BullMQ is already justified by webhook SLAs and chain latency — do **not** add another queue for “future scaling” without metrics.

---

## 4. Anti-patterns (defer without evidence)

- New microservice or repo split with under three engineers on the project.
- Repository pattern wrapping Supabase with a single implementation.
- Feature flags without an active experiment.
- Extra caching layer before slow queries are profiled and indexed.
- “Multi-tenant” data model when there is one publisher.

---

## 5. UI render path (React / App Router)

- **Server Components:** no browser-only APIs; no mutating globals during render.
- **Client Components:** render = function of props/state only — **no** `fetch`, `setState`, subscriptions, or writes in the render body.
- Side effects belong in **`useEffect`**, event handlers, or Server Actions / Route Handlers.

Violation = **architecture issue**, not style.

---

## 6. Stack conventions

| Area | Rule |
|------|------|
| **Supabase** | Migrations in [`supabase/migrations/`](../supabase/migrations/); RLS and policies reviewed before exposing anon access. |
| **Secrets** | Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `THIRDWEB_PRIVATE_KEY`, webhook secrets — never `NEXT_PUBLIC_*`. |
| **BullMQ** | Jobs: timeout, max attempts, structured logs (`payment_id`, `order_id`, `job_id`). Failed jobs = operational DLQ surface. |
| **External APIs** | RPC / Crossmint / Alchemy: timeout + bounded retry + log on final failure. |

When **dual-write** (Postgres + queue) becomes a real incident driver, follow [`ARCHITECTURE.md`](ARCHITECTURE.md) (outbox pattern) — not before the first evidence.

---

## 7. Observability (minimum viable)

Start with:

- Health check endpoint for the API process.
- Structured error logging for webhooks and workers.

Add APM / dashboards when latency or error budgets are defined — not by default.

---

## 8. Mini health review (template)

Time-box **15–30 min**. Use when touching multiple layers.

| Area | Status (G/Y/R) | Top risk |
|------|----------------|----------|
| API | | |
| DB | | |
| UI | | |
| Jobs | | |

**Backlog “later” items** must include a **trigger** (e.g. “when mint failure rate &gt; 1% for 24h”).

Deliverables: **PR-sized** tasks, each completable in ≤1 day — no “rewrite everything.”

---

## 9. Related docs

| Document | Role |
|----------|------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Rationale, dual-write, idempotency, keys |
| [`MVP_DEVELOPMENT_PLAN.md`](MVP_DEVELOPMENT_PLAN.md) | Sprint sequencing |
| [`README.md`](../README.md) | Setup and env |

---

## 10. Revision history

| Date | Note |
|------|------|
| 2026-04-06 | Initial playbook from minimal-delivery-health skill |
