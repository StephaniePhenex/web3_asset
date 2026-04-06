import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type {
  ArticleCiphertextEnvelope,
  ArticleCiphertextEnvelopeV1,
} from "./article-ciphertext-types";

export type {
  ArticleCiphertextEnvelope,
  ArticleCiphertextEnvelopeV1,
} from "./article-ciphertext-types";
export { isV1EnvelopeJson, parseEnvelopeFromStored } from "./article-envelope";

const IV_LENGTH = 12;

/** 32-byte key from `ARTICLE_CONTENT_KEY` (64 hex chars). */
export function parseArticleContentKey(): Buffer {
  const hex = process.env.ARTICLE_CONTENT_KEY?.trim();
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "ARTICLE_CONTENT_KEY must be 64 hex characters (32 bytes AES-256)"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptArticleUtf8(
  plaintext: string,
  key: Buffer
): ArticleCiphertextEnvelopeV1 {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    ciphertext: enc.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptArticleUtf8(
  envelope: ArticleCiphertextEnvelope,
  key: Buffer
): string {
  if (envelope.v !== 1 || envelope.alg !== "AES-256-GCM") {
    throw new Error("Unsupported article ciphertext envelope");
  }
  const iv = Buffer.from(envelope.iv, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}

export function envelopeToStoredJson(envelope: ArticleCiphertextEnvelope): string {
  return JSON.stringify(envelope);
}
