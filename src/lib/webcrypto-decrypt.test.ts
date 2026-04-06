import { describe, expect, it } from "vitest";
import { encryptArticleUtf8, parseArticleContentKey } from "./article-crypto";
import { decryptArticleV1WebCrypto, parseBrowserContentKeyHex } from "./webcrypto-decrypt";

const DEV_ZERO_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

describe("webcrypto-decrypt", () => {
  it("decrypts v1 envelope produced by Node crypto (Web Crypto)", async () => {
    const prev = process.env.ARTICLE_CONTENT_KEY;
    process.env.ARTICLE_CONTENT_KEY = DEV_ZERO_KEY;
    try {
      const key = parseArticleContentKey();
      const envelope = encryptArticleUtf8("browser roundtrip", key);
      const raw = parseBrowserContentKeyHex(DEV_ZERO_KEY);
      const plain = await decryptArticleV1WebCrypto(envelope, raw);
      expect(plain).toBe("browser roundtrip");
    } finally {
      if (prev === undefined) delete process.env.ARTICLE_CONTENT_KEY;
      else process.env.ARTICLE_CONTENT_KEY = prev;
    }
  });
});
