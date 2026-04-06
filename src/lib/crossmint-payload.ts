/**
 * Normalizes Crossmint-style or internal JSON bodies (camelCase or snake_case).
 */
export function parseMintWebhookFields(body: Record<string, unknown>): {
  paymentId: string;
  userAddress: string;
  articleId: string;
} | null {
  const paymentId = pickString(body, ["paymentId", "payment_id"]);
  const userAddress = pickString(body, ["userAddress", "user_address"]);
  const articleId = pickString(body, ["articleId", "article_id"]);

  if (!paymentId || !userAddress || !articleId) {
    return null;
  }

  return { paymentId, userAddress, articleId };
}

function pickString(
  body: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const v = body[key];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return null;
}
