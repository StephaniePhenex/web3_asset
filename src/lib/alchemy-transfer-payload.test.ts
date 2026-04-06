import { describe, expect, it } from "vitest";
import { parseTransferWebhookBody } from "./alchemy-transfer-payload";

describe("parseTransferWebhookBody", () => {
  it("parses flat dev body", () => {
    expect(
      parseTransferWebhookBody(
        {
          to: "0xabc",
          tokenId: "7",
          articleId: "11111111-1111-4111-8111-111111111111",
        },
        null
      )
    ).toEqual({
      toAddress: "0xabc",
      tokenId: "7",
      articleId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("uses default article when omitted", () => {
    expect(
      parseTransferWebhookBody(
        { toAddress: "0xdef", tokenId: "1" },
        "22222222-2222-4222-8222-222222222222"
      )
    ).toEqual({
      toAddress: "0xdef",
      tokenId: "1",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns null when article unknown", () => {
    expect(parseTransferWebhookBody({ to: "0x1", tokenId: "1" }, null)).toBeNull();
  });
});
