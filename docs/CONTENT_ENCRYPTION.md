# Content encryption (MVP)

## Stance

| Topic | MVP choice |
|-------|------------|
| **At rest** | `articles.encrypted_content` holds a **JSON envelope** (v1 AES-256-GCM: `iv`, `ciphertext`, `tag`, version `v`). |
| **Who decrypts** | **Browser** in Day 9 using **Web Crypto**, using the same envelope shape returned by `POST /api/get-article-content`. |
| **Key material** | Symmetric key in `ARTICLE_CONTENT_KEY` (server-only) for **encrypting at ingest** and **Node tests**. **Do not** expose this to production browsers. For **local Day 9 demos only**, `NEXT_PUBLIC_ARTICLE_CONTENT_KEY` may match `ARTICLE_CONTENT_KEY` so the browser can decrypt via Web Crypto — replace with Lit / per-user key delivery before production. |
| **Giving keys to holders** | Production should use **Lit**, wrapped keys, or **short-lived signed URLs** to a key endpoint — not a shared global secret in the frontend. `CONTENT_KEY_SOURCE` documents intent; `lit-stub` and `signed-url-stub` are placeholders until wired. |
| **Server decrypt** | Supported in Node (`src/lib/article-crypto.ts`) for admin tooling and tests only — not required for the public article read path. |

## Envelope (v1)

Stored as a single JSON string in `encrypted_content`:

```json
{
  "v": 1,
  "alg": "AES-256-GCM",
  "iv": "<base64>",
  "ciphertext": "<base64>",
  "tag": "<base64>"
}
```

API adds `encryptionFormat: "v1-aes-gcm"` alongside `encryptedContent` (parsed object). Legacy non-JSON rows use `encryptionFormat: "legacy-plaintext"`.

## Tooling

- **Encrypt CLI:** `npx tsx scripts/encrypt-article-body.ts "plaintext"`
- **Decrypt:** use `decryptArticleUtf8` in tests with the same `ARTICLE_CONTENT_KEY`.

## Local dev key

`supabase/seed.sql` sample ciphertext is encrypted with the **all-zero dev key** (64 hex zeros). Set `ARTICLE_CONTENT_KEY` to that value locally to decrypt in Node, or replace ciphertext using the encrypt script with your own key.
