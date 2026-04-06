import { describe, expect, it } from "vitest";
import { parseMintWebhookFields } from "./crossmint-payload";

describe("parseMintWebhookFields", () => {
  it("parses camelCase", () => {
    expect(
      parseMintWebhookFields({
        paymentId: "p1",
        userAddress: "0xabc",
        articleId: "11111111-1111-4111-8111-111111111111",
      })
    ).toEqual({
      paymentId: "p1",
      userAddress: "0xabc",
      articleId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("parses snake_case", () => {
    expect(
      parseMintWebhookFields({
        payment_id: "p2",
        user_address: "0xdef",
        article_id: "22222222-2222-4222-8222-222222222222",
      })
    ).toEqual({
      paymentId: "p2",
      userAddress: "0xdef",
      articleId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns null if any field missing", () => {
    expect(parseMintWebhookFields({ paymentId: "a" })).toBeNull();
  });
});
