import { describe, expect, it } from "vitest";
import { mockMintResult } from "./mint-onchain";

describe("mockMintResult", () => {
  it("returns 0x-prefixed hex and stable token id for same inputs", () => {
    const a = mockMintResult("pay-1", "99");
    expect(a.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(a.tokenId).toBe("mock-99");
    expect(mockMintResult("pay-1", "99").txHash).toBe(a.txHash);
  });
});
