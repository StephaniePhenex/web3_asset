import type { ArticleCiphertextEnvelope } from "./article-ciphertext-types";

export function parseEnvelopeFromStored(
  stored: string
): ArticleCiphertextEnvelope {
  const o = JSON.parse(stored) as ArticleCiphertextEnvelope;
  if (o?.v !== 1 || o?.alg !== "AES-256-GCM") {
    throw new Error("Invalid v1 AES-GCM envelope");
  }
  if (!o.iv || !o.ciphertext || !o.tag) {
    throw new Error("Envelope missing iv/ciphertext/tag");
  }
  return o;
}

export function isV1EnvelopeJson(stored: string): boolean {
  try {
    parseEnvelopeFromStored(stored);
    return true;
  } catch {
    return false;
  }
}
