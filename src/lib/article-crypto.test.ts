import { describe, expect, it } from "vitest";
import {
  decryptArticleUtf8,
  encryptArticleUtf8,
  envelopeToStoredJson,
  parseArticleContentKey,
  parseEnvelopeFromStored,
} from "./article-crypto";

const DEV_ZERO_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

describe("article-crypto", () => {
  it("roundtrips UTF-8 plaintext", () => {
    const prev = process.env.ARTICLE_CONTENT_KEY;
    process.env.ARTICLE_CONTENT_KEY = DEV_ZERO_KEY;
    try {
      const key = parseArticleContentKey();
      const plain = "Hello MVP — 加密";
      const env = encryptArticleUtf8(plain, key);
      expect(env.v).toBe(1);
      expect(env.alg).toBe("AES-256-GCM");
      expect(decryptArticleUtf8(env, key)).toBe(plain);
    } finally {
      if (prev === undefined) delete process.env.ARTICLE_CONTENT_KEY;
      else process.env.ARTICLE_CONTENT_KEY = prev;
    }
  });

  it("stored JSON string parses and decrypts", () => {
    const prev = process.env.ARTICLE_CONTENT_KEY;
    process.env.ARTICLE_CONTENT_KEY = DEV_ZERO_KEY;
    try {
      const key = parseArticleContentKey();
      const env = encryptArticleUtf8("x", key);
      const stored = envelopeToStoredJson(env);
      const parsed = parseEnvelopeFromStored(stored);
      expect(decryptArticleUtf8(parsed, key)).toBe("x");
    } finally {
      if (prev === undefined) delete process.env.ARTICLE_CONTENT_KEY;
      else process.env.ARTICLE_CONTENT_KEY = prev;
    }
  });
});
