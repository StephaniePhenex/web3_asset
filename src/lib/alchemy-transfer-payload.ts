/**
 * Parses Alchemy Notify–style or simplified dev payloads into transfer fields.
 * Production Alchemy payloads vary; extend this when wiring official Notify.
 */

export type ParsedTransfer = {
  toAddress: string;
  tokenId: string;
  articleId: string;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function firstActivity(
  body: Record<string, unknown>
): Record<string, unknown> | null {
  const ev = body.event;
  if (!ev || typeof ev !== "object") {
    return null;
  }
  const act = (ev as Record<string, unknown>).activity;
  if (Array.isArray(act) && act[0] && typeof act[0] === "object") {
    return act[0] as Record<string, unknown>;
  }
  return null;
}

/**
 * Dev / manual shape:
 * `{ to | toAddress, tokenId, articleId? }` or snake_case.
 *
 * Tries `event.activity[0]` for common Alchemy Address Activity fields.
 */
export function parseTransferWebhookBody(
  body: Record<string, unknown>,
  defaultArticleId: string | null
): ParsedTransfer | null {
  const act = firstActivity(body);

  const to =
    str(body.to) ??
    str(body.toAddress) ??
    str(body.recipient) ??
    (act ? str(act.toAddress) ?? str(act.to) : null);

  const tokenId =
    str(body.tokenId) ??
    str(body.token_id) ??
    str(body.erc721TokenId) ??
    (act ? str(act.erc721TokenId) ?? str(act.tokenId) : null);

  const articleFromBody =
    str(body.articleId) ?? str(body.article_id) ?? (act ? str(act.articleId) : null);

  if (!to || !tokenId) {
    return null;
  }

  const articleId = articleFromBody ?? defaultArticleId;
  if (!articleId) {
    return null;
  }

  return { toAddress: to, tokenId, articleId };
}
