import { NextResponse } from "next/server";
import { getMintQueue, type MintJobPayload } from "@/lib/queues/mint-queue";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyWebhookSecret } from "@/lib/webhook-secret";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

type CrossmintWebhookBody = {
  paymentId?: string;
  userAddress?: string;
  articleId?: string;
};

/**
 * Placeholder Crossmint-compatible payment webhook.
 * Auth: `Authorization: Bearer <CROSSMINT_WEBHOOK_SECRET>` or `X-Webhook-Secret`.
 * Body JSON: `{ "paymentId", "userAddress", "articleId" }` (articleId = UUID of `articles`).
 *
 * Idempotent on `payment_id`: duplicate deliveries return 200 `{ duplicate: true }` without re-enqueueing.
 * Swap `verifyWebhookSecret` for Crossmint's official verifier when integrating for real.
 */
export async function POST(request: Request) {
  const secret = process.env.CROSSMINT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CROSSMINT_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  if (!verifyWebhookSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CrossmintWebhookBody;
  try {
    body = (await request.json()) as CrossmintWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  const userAddress =
    typeof body.userAddress === "string" ? body.userAddress.trim() : "";
  const articleId =
    typeof body.articleId === "string" ? body.articleId.trim() : "";

  if (!paymentId || !userAddress || !articleId) {
    return NextResponse.json(
      { error: "paymentId, userAddress, and articleId are required" },
      { status: 400 }
    );
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(articleId)) {
    return NextResponse.json(
      { error: "articleId must be a valid UUID" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (selectError) {
    console.error("[webhook crossmint] orders select", selectError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      orderId: existing.id,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("orders")
    .insert({
      payment_id: paymentId,
      user_address: userAddress,
      article_id: articleId,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (insertError.code === "23503") {
      return NextResponse.json(
        { error: "articleId does not exist or reference invalid" },
        { status: 400 }
      );
    }
    console.error("[webhook crossmint] orders insert", insertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const payload: MintJobPayload = { paymentId, userAddress, articleId };
  const queue = getMintQueue();

  try {
    await queue.add("mint", payload, {
      jobId: `mint:${paymentId}`,
    });
  } catch (e) {
    console.error("[webhook crossmint] enqueue failed", e);
    await supabase.from("orders").delete().eq("id", inserted.id);
    return NextResponse.json(
      { error: "Failed to enqueue mint job" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    orderId: inserted.id,
    enqueued: true,
  });
}
