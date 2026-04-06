-- Day 4: on-chain mint result + support errors

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS token_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

COMMENT ON COLUMN public.orders.token_id IS 'NFT token id after successful mint (string for bigint safety)';
COMMENT ON COLUMN public.orders.failure_reason IS 'Last failure message when status = FAILED';
