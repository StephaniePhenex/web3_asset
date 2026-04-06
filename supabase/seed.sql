-- Optional dev article for local webhook tests (FK target for article_id).
-- Apply manually in SQL Editor, or enable [db.seed] in config.toml and run `supabase db reset`.
-- Fixed UUID matches docs/sprints/day-03-log.md examples.
-- encrypted_content: v1 AES-GCM JSON; plaintext "MVP dev placeholder article body";
-- decrypt in Node with ARTICLE_CONTENT_KEY = 64 hex zeros (see docs/CONTENT_ENCRYPTION.md).

INSERT INTO public.articles (
  id,
  title,
  encrypted_content,
  price,
  cover_url
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'MVP dev placeholder article',
  '{"v":1,"alg":"AES-256-GCM","iv":"DoQmq0/6LOACfhsU","ciphertext":"govc6D7sfuvi/yz/7Za1K2qpJv8HN56ogXVmzK+IRyA=","tag":"iBLy+gKwwXaCQXMrKBF6hw=="}',
  0,
  NULL
)
ON CONFLICT (id) DO NOTHING;
