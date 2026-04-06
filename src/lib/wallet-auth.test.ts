import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import {
  articleAccessMessage,
  verifyArticleAccessSignature,
} from "./wallet-auth";

describe("wallet-auth", () => {
  it("accepts a valid personal_sign over articleAccessMessage", async () => {
    const w = Wallet.createRandom();
    const articleId = "550e8400-e29b-41d4-a716-446655440000";
    const msg = articleAccessMessage(articleId, w.address);
    const sig = await w.signMessage(msg);
    expect(
      verifyArticleAccessSignature(articleId, w.address, sig)
    ).toBe(true);
  });

  it("rejects wrong signer", async () => {
    const a = Wallet.createRandom();
    const b = Wallet.createRandom();
    const articleId = "550e8400-e29b-41d4-a716-446655440000";
    const msg = articleAccessMessage(articleId, a.address);
    const sig = await a.signMessage(msg);
    expect(
      verifyArticleAccessSignature(articleId, b.address, sig)
    ).toBe(false);
  });

  it("rejects invalid address", () => {
    expect(
      verifyArticleAccessSignature("550e8400-e29b-41d4-a716-446655440000", "not-an-address", "0x")
    ).toBe(false);
  });
});
