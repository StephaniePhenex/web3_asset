# Day 4 — NFT minting in worker (log)

**Date:** 2026-04-06  
**Plan reference:** [MVP_DEVELOPMENT_PLAN.md § Day 4](../MVP_DEVELOPMENT_PLAN.md)

---

## Delivered

| Task | Implementation |
|------|------------------|
| Thirdweb `mintTo` | [`src/lib/mint-onchain.ts`](../../src/lib/mint-onchain.ts) — `MINT_MODE=chain` uses `ThirdwebSDK.fromPrivateKey` + `getContract(..., "nft-collection")` + `erc721.mintTo` |
| Mock mint (no gas) | `MINT_MODE=mock` (default) — `mockMintResult()` writes deterministic `tx_hash` / `token_id` |
| Retries / DLQ | Queue `defaultJobOptions` unchanged (5 attempts, exponential backoff); worker `failed` updates `orders.failure_reason` when job **terminally** fails |
| 5 jobs/sec | Unchanged on worker [`scripts/mint-worker.ts`](../../scripts/mint-worker.ts) |
| Order lifecycle | `PROCESSING` → `COMPLETED` + `tx_hash` + `token_id`; terminal failure → `FAILED` + `failure_reason` |
| Webhook | Passes `orderId` in job payload [`src/app/api/webhooks/crossmint/route.ts`](../../src/app/api/webhooks/crossmint/route.ts) |
| Schema | [`supabase/migrations/20250406120000_orders_token_and_failure.sql`](../../supabase/migrations/20250406120000_orders_token_and_failure.sql) — `token_id`, `failure_reason` |

---

## Environment

| Variable | Role |
|----------|------|
| `MINT_MODE` | `mock` (default) or `chain` |
| `THIRDWEB_PRIVATE_KEY` | Signer (chain mode) |
| `CHAIN_RPC_URL` | RPC URL (chain mode) |
| `NFT_CONTRACT_ADDRESS` | ERC-721 / Thirdweb **nft-collection** (chain mode) |
| `NFT_CONTRACT_TYPE` | Optional; default `nft-collection` |

Apply migration locally: `supabase db reset` or run SQL in Studio after `supabase start`.

---

## Milestone M3

**Chain mode:** requires funded key + deployed **nft-collection** on the target network; then webhook → queue → **on-chain tx** → `orders` = `COMPLETED`.

**Mock mode:** full pipeline without chain for local integration tests.
