import { describe, expect, it } from "vitest";
import { verifyWebhookSecret } from "./webhook-secret";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/webhooks/crossmint", { headers });
}

describe("verifyWebhookSecret", () => {
  it("accepts matching Bearer token", () => {
    const ok = verifyWebhookSecret(
      req({ authorization: "Bearer my-secret-value" }),
      "my-secret-value"
    );
    expect(ok).toBe(true);
  });

  it("accepts matching X-Webhook-Secret", () => {
    const ok = verifyWebhookSecret(
      req({ "x-webhook-secret": "another-secret" }),
      "another-secret"
    );
    expect(ok).toBe(true);
  });

  it("rejects wrong secret with 401 semantics", () => {
    expect(
      verifyWebhookSecret(req({ authorization: "Bearer a" }), "b")
    ).toBe(false);
    expect(
      verifyWebhookSecret(
        req({ authorization: "Bearer wrong" }),
        "correct"
      )
    ).toBe(false);
  });

  it("rejects missing header", () => {
    expect(verifyWebhookSecret(req({}), "secret")).toBe(false);
  });

  it("rejects length mismatch without throwing", () => {
    expect(
      verifyWebhookSecret(req({ authorization: "Bearer short" }), "much-longer-secret")
    ).toBe(false);
  });
});
