import type { ArticleCiphertextEnvelope } from "./article-ciphertext-types";
import { isV1EnvelopeJson } from "./article-envelope";

export type EncryptedContentApiV1 = {
  encryptionFormat: "v1-aes-gcm";
  encryptedContent: ArticleCiphertextEnvelope;
};

export type EncryptedContentApiLegacy = {
  encryptionFormat: "legacy-plaintext";
  /** Raw DB string (pre–Day 8 placeholder or non-JSON). */
  encryptedContent: string;
};

export type EncryptedContentApi = EncryptedContentApiV1 | EncryptedContentApiLegacy;

/**
 * Maps `articles.encrypted_content` DB text to the Day 7/8 API payload shape.
 */
export function mapStoredContentToApi(stored: string): EncryptedContentApi {
  if (isV1EnvelopeJson(stored)) {
    return {
      encryptionFormat: "v1-aes-gcm",
      encryptedContent: JSON.parse(stored) as ArticleCiphertextEnvelope,
    };
  }
  return {
    encryptionFormat: "legacy-plaintext",
    encryptedContent: stored,
  };
}
