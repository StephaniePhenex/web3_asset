-- CAP v3.0 — initial schema (articles, orders, ownership_cache)
-- Requires PostgreSQL 13+ (gen_random_uuid)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.order_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE public.ownership_source AS ENUM (
  'MINT',
  'TRANSFER',
  'SYNC'
);

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  title text NOT NULL,
  encrypted_content text NOT NULL,
  price numeric(18, 8) NOT NULL CHECK (price >= 0),
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.articles IS 'Premium article metadata and ciphertext body';

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  payment_id text NOT NULL,
  user_address text NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'PENDING',
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_payment_id_unique UNIQUE (payment_id)
);

COMMENT ON TABLE public.orders IS 'Payment-driven mint pipeline; one row per payment_id';

CREATE INDEX idx_orders_article_id ON public.orders (article_id);

CREATE INDEX idx_orders_user_address ON public.orders (user_address);

CREATE INDEX idx_orders_status_created_at ON public.orders (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- ownership_cache
-- ---------------------------------------------------------------------------
CREATE TABLE public.ownership_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  owner_address text NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  token_id text NOT NULL,
  source public.ownership_source NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ownership_cache_article_token_unique UNIQUE (article_id, token_id)
);

COMMENT ON TABLE public.ownership_cache IS 'Hybrid guard: write-through + webhook sync';

CREATE INDEX idx_ownership_cache_owner_address ON public.ownership_cache (owner_address);

CREATE INDEX idx_ownership_cache_article_id ON public.ownership_cache (article_id);

CREATE INDEX idx_ownership_cache_owner_article ON public.ownership_cache (owner_address, article_id);
