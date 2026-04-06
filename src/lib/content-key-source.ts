/**
 * How content decryption keys are meant to reach entitled clients (MVP flags).
 *
 * - **env**: symmetric key in `ARTICLE_CONTENT_KEY` (server + admin tooling only).
 *   Holders still receive ciphertext from Day 7 API; for production, prefer moving
 *   to Lit or per-user key wrapping instead of shipping this secret to browsers.
 * - **lit-stub**: Lit / threshold decryption is not wired; use for feature gating
 *   and docs. Encrypt path may still use `ARTICLE_CONTENT_KEY` for at-rest storage.
 * - **signed-url-stub**: Short-lived key URLs are not implemented yet (see docs).
 */
export type ContentKeySource = "env" | "lit-stub" | "signed-url-stub";

export function getContentKeySource(): ContentKeySource {
  const raw = process.env.CONTENT_KEY_SOURCE?.trim().toLowerCase();
  if (raw === "lit-stub" || raw === "lit") return "lit-stub";
  if (raw === "signed-url-stub" || raw === "signed-url") {
    return "signed-url-stub";
  }
  return "env";
}

export function litKeyStubMessage(): string {
  return (
    "Lit network key material is not wired in MVP stub mode. " +
    "Use CONTENT_KEY_SOURCE=env for local encrypt/decrypt, or integrate Lit SDK on the client."
  );
}
