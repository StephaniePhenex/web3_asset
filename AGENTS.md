<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Delivery & scope (CAP / web3_asset)

Before adding abstractions, services, or queues, read [`docs/DELIVERY_PLAYBOOK.md`](docs/DELIVERY_PLAYBOOK.md): decision gate (problem → evidence → smallest fix), over-engineering score, and **React render purity** (no side effects in render). Dual-write / outbox guidance stays in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) until evidence requires it.
