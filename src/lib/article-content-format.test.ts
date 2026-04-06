import { describe, expect, it } from "vitest";
import { mapStoredContentToApi } from "./article-content-format";

describe("article-content-format", () => {
  it("detects v1 envelope JSON", () => {
    const stored = JSON.stringify({
      v: 1,
      alg: "AES-256-GCM",
      iv: "AAAA",
      ciphertext: "BBBB",
      tag: "CCCC",
    });
    const r = mapStoredContentToApi(stored);
    expect(r.encryptionFormat).toBe("v1-aes-gcm");
    if (r.encryptionFormat === "v1-aes-gcm") {
      expect(r.encryptedContent.v).toBe(1);
    }
  });

  it("treats non-JSON as legacy", () => {
    const r = mapStoredContentToApi("placeholder-ciphertext");
    expect(r.encryptionFormat).toBe("legacy-plaintext");
    if (r.encryptionFormat === "legacy-plaintext") {
      expect(r.encryptedContent).toBe("placeholder-ciphertext");
    }
  });
});
