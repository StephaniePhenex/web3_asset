import { NextResponse } from "next/server";
import { assertArticleReadAccess } from "@/lib/article-access";
import { mapStoredContentToApi } from "@/lib/article-content-format";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyArticleAccessSignature } from "@/lib/wallet-auth";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { error: "Use POST with articleId, address, signature" },
    { status: 405 }
  );
}

type Body = {
  articleId?: string;
  address?: string;
  signature?: string;
};

/**
 * NFT-gated article payload. Returns ciphertext only (no plaintext logging).
 * Client must sign the EIP-191 message from `articleAccessMessage` in `wallet-auth`.
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

  let allowed: boolean;
  try {
    allowed = await assertArticleReadAccess(address, articleId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "access check failed";
    console.error("[get-article-content] access error", { articleId, msg });
    return NextResponse.json({ error: "Access check failed" }, { status: 500 });
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = createSupabaseAdmin();
  const { data: article, error } = await sb
    .from("articles")
    .select("id, title, encrypted_content")
    .eq("id", articleId)
    .maybeSingle();

  if (error) {
    console.error("[get-article-content] db", { articleId, code: error.code });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const payload = mapStoredContentToApi(article.encrypted_content);
  return NextResponse.json({
    articleId: article.id,
    title: article.title,
    ...payload,
  });
}
