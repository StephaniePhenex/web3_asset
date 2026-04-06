import { NextResponse } from "next/server";
import { parseTransferWebhookBody } from "@/lib/alchemy-transfer-payload";
import { upsertOwnershipFromTransfer } from "@/lib/ownership-cache";
import { verifyWebhookSecret } from "@/lib/webhook-secret";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

/**
 * Placeholder for Alchemy Notify (Address Activity / Transfer).
 * Auth: same as Crossmint placeholder — `Authorization: Bearer <ALCHEMY_WEBHOOK_SECRET>` or `X-Webhook-Secret`.
 *
 * Body: dev-friendly `{ to, tokenId, articleId? }` or Alchemy-shaped `event.activity[]`.
 * If `articleId` is omitted, uses `MVP_DEFAULT_ARTICLE_ID` (single-article MVP).
 *
 * Replace with Alchemy signature verification when using official signing keys.
 */
export async function POST(request: Request) {
  const secret = process.env.ALCHEMY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ALCHEMY_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  if (!verifyWebhookSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const defaultArticle = process.env.MVP_DEFAULT_ARTICLE_ID?.trim() || null;

  const parsed = parseTransferWebhookBody(raw, defaultArticle);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Could not parse transfer (need to/toAddress, tokenId, and articleId or MVP_DEFAULT_ARTICLE_ID)",
      },
      { status: 400 }
    );
  }

  try {
    await upsertOwnershipFromTransfer({
      ownerAddress: parsed.toAddress,
      articleId: parsed.articleId,
      tokenId: parsed.tokenId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[webhook alchemy]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, source: "TRANSFER" });
}
