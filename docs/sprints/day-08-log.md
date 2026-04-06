# Day 8 — Content encryption

**Date:** 2026-04-07  
**Reference:** [MVP_DEVELOPMENT_PLAN.md § Day 8](../MVP_DEVELOPMENT_PLAN.md)

## Delivered

| Item | Location |
|------|----------|
| AES-256-GCM envelope v1 (IV + tag + version) | `src/lib/article-crypto.ts` |
| API mapping | `src/lib/article-content-format.ts` — `encryptionFormat` + `encryptedContent` |
| Key / distribution flags | `src/lib/content-key-source.ts` (`CONTENT_KEY_SOURCE`, Lit/signed-URL stub messaging) |
| Node tests | `src/lib/article-crypto.test.ts` |
| Encrypt CLI | `scripts/encrypt-article-body.ts` |
| MVP stance | [`docs/CONTENT_ENCRYPTION.md`](../CONTENT_ENCRYPTION.md) |
| Seed sample | [`supabase/seed.sql`](../../supabase/seed.sql) — v1 ciphertext (dev zero key) |

## API shape change (Day 7 extension)

`POST /api/get-article-content` success body now includes:

- `encryptionFormat`: `"v1-aes-gcm"` | `"legacy-plaintext"`
- `encryptedContent`: envelope object **or** raw string (legacy)

## Follow-ups

- Day 9: Web Crypto decrypt + avoid logging plaintext.
- Production: replace global symmetric key with Lit or per-session key delivery (`signed-url-stub`).
