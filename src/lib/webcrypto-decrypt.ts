import type { ArticleCiphertextEnvelope } from "./article-ciphertext-types";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/** Hex key from `NEXT_PUBLIC_ARTICLE_CONTENT_KEY` (64 hex chars = 32 bytes). */
export function parseBrowserContentKeyHex(hex: string): Uint8Array {
  const t = hex.trim();
  if (t.length !== 64 || !/^[0-9a-fA-F]+$/.test(t)) {
    throw new Error(
      "NEXT_PUBLIC_ARTICLE_CONTENT_KEY must be 64 hex characters (32 bytes)"
    );
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function hasBrowserContentKey(): boolean {
  const k = process.env.NEXT_PUBLIC_ARTICLE_CONTENT_KEY?.trim();
  return !!k && k.length === 64 && /^[0-9a-fA-F]+$/.test(k);
}

/**
 * Decrypts v1 AES-GCM envelope using Web Crypto (matches Node `article-crypto` layout).
 * Ciphertext + auth tag are concatenated for `subtle.decrypt` (Web Crypto convention).
 */
export async function decryptArticleV1WebCrypto(
  envelope: ArticleCiphertextEnvelope,
  rawKey32: Uint8Array
): Promise<string> {
  if (envelope.v !== 1 || envelope.alg !== "AES-256-GCM") {
    throw new Error("Unsupported article ciphertext envelope");
  }
  const iv = new Uint8Array(base64ToBytes(envelope.iv));
  const ct = base64ToBytes(envelope.ciphertext);
  const tag = base64ToBytes(envelope.tag);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);

  const rawKeyCopy = new Uint8Array(rawKey32);
  const key = await crypto.subtle.importKey(
    "raw",
    rawKeyCopy,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    combined
  );
  return new TextDecoder().decode(decrypted);
}
