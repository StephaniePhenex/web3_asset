import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyArticleAccessSignature } from "@/lib/wallet-auth";

export const dynamic = "force-dynamic";

type Body = {
  articleId?: string;
  address?: string;
  signature?: string;
};

function addrEq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Signed read: latest order row for this wallet + article, plus ownership_cache token id.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const articleId = typeof body.articleId === "string" ? body.articleId.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";

  if (!articleId || !address || !signature) {
    return NextResponse.json(
      { error: "articleId, address, and signature are required" },
      { status: 400 }
    );
  }

  if (!verifyArticleAccessSignature(articleId, address, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let normalized: string;
  try {
    normalized = ethers.utils.getAddress(address);
  } catch {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const sb = createSupabaseAdmin();

  const { data: orderRows, error: orderErr } = await sb
    .from("orders")
    .select("status, token_id, created_at, user_address")
    .eq("article_id", articleId);

  if (orderErr) {
    console.error("[article-order-status] orders", orderErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const mine = (orderRows ?? []).filter((row) =>
    addrEq(row.user_address as string, normalized)
  );
  mine.sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() -
      new Date(a.created_at as string).getTime()
  );
  const latest = mine[0];

  const { data: cacheRows, error: cacheErr } = await sb
    .from("ownership_cache")
    .select("token_id, owner_address")
    .eq("article_id", articleId);

  if (cacheErr) {
    console.error("[article-order-status] cache", cacheErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const cacheHit = cacheRows?.find((row) =>
    addrEq(row.owner_address as string, normalized)
  );

  const orderTokenId =
    latest?.status === "COMPLETED" ? (latest.token_id as string | null) : null;

  return NextResponse.json({
    order: latest
      ? {
          status: latest.status,
          tokenId: latest.token_id as string | null,
        }
      : null,
    ownershipTokenId: cacheHit?.token_id ?? null,
    displayTokenId: cacheHit?.token_id ?? orderTokenId,
  });
}
