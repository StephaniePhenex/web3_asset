import { timingSafeEqual } from "node:crypto";

/**
 * Placeholder verification for payment webhooks: shared secret via
 * `Authorization: Bearer <secret>` or `X-Webhook-Secret: <secret>`.
 * Replace with Crossmint's documented signature/HMAC when keys are available.
 */
export function verifyWebhookSecret(request: Request, envSecret: string | undefined): boolean {
  if (!envSecret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const header = request.headers.get("x-webhook-secret");
  const provided = bearer ?? header ?? "";

  if (provided.length !== envSecret.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(envSecret, "utf8"));
  } catch {
    return false;
  }
}
