-- Optional dev article for local webhook tests (FK target for article_id).
-- Apply manually in SQL Editor, or enable [db.seed] in config.toml and run `supabase db reset`.
-- Fixed UUID matches docs/sprints/day-03-log.md examples.

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
  'placeholder-ciphertext',
  0,
  NULL
)
ON CONFLICT (id) DO NOTHING;
