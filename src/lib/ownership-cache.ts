import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type OwnershipSource = "MINT" | "TRANSFER" | "SYNC";

/**
 * Write-through upsert after successful mint (or idempotent replay).
 * Unique key: (article_id, token_id).
 */
export async function upsertOwnershipFromMint(params: {
  ownerAddress: string;
  articleId: string;
  tokenId: string;
}): Promise<void> {
  await upsertRow({
    ...params,
    source: "MINT",
  });
}

/**
 * Update owner after secondary Transfer (Alchemy / indexer).
 */
export async function upsertOwnershipFromTransfer(params: {
  ownerAddress: string;
  articleId: string;
  tokenId: string;
}): Promise<void> {
  await upsertRow({
    ...params,
    source: "TRANSFER",
  });
}

async function upsertRow(params: {
  ownerAddress: string;
  articleId: string;
  tokenId: string;
  source: OwnershipSource;
}): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("ownership_cache").upsert(
    {
      owner_address: params.ownerAddress,
      article_id: params.articleId,
      token_id: params.tokenId,
      source: params.source,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "article_id,token_id" }
  );

  if (error) {
    throw new Error(`ownership_cache upsert: ${error.message}`);
  }
}
