import { ethers } from "ethers";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { upsertOwnershipFromSync } from "@/lib/ownership-cache";

const ERC721_OWNER_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
];

function addrEq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Returns true if `walletAddress` may read `articleId` content: `ownership_cache` first,
 * then `orders` + on-chain `ownerOf` with cache refresh (`SYNC`).
 */
export async function assertArticleReadAccess(
  walletAddress: string,
  articleId: string
): Promise<boolean> {
  let normalized: string;
  try {
    normalized = ethers.utils.getAddress(walletAddress);
  } catch {
    return false;
  }

  const sb = createSupabaseAdmin();

  const { data: cacheRows, error: cacheErr } = await sb
    .from("ownership_cache")
    .select("owner_address, token_id")
    .eq("article_id", articleId);

  if (cacheErr) {
    throw new Error(cacheErr.message);
  }

  const cacheHit = cacheRows?.some((r) =>
    addrEq(r.owner_address as string, normalized)
  );
  if (cacheHit) {
    return true;
  }

  const { data: orderRows, error: orderErr } = await sb
    .from("orders")
    .select("token_id, user_address")
    .eq("article_id", articleId)
    .eq("status", "COMPLETED")
    .not("token_id", "is", null);

  if (orderErr) {
    throw new Error(orderErr.message);
  }

  const mine = (orderRows ?? []).filter((row) =>
    addrEq(row.user_address as string, normalized)
  );

  const rpc = process.env.CHAIN_RPC_URL;
  const nft = process.env.NFT_CONTRACT_ADDRESS;
  if (!rpc || !nft) {
    return false;
  }

  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(nft, ERC721_OWNER_ABI, provider);

  for (const row of mine) {
    const tid = row.token_id as string;
    if (!tid || tid.startsWith("mock-")) {
      continue;
    }
    try {
      const onChain = await contract.ownerOf(tid);
      if (addrEq(onChain, normalized)) {
        await upsertOwnershipFromSync({
          ownerAddress: normalized,
          articleId,
          tokenId: tid,
        });
        return true;
      }
    } catch {
      /* ownerOf reverted or RPC error */
    }
  }

  return false;
}
