/**
 * Compare ownership_cache.owner_address with on-chain ownerOf(tokenId).
 * Requires: CHAIN_RPC_URL, NFT_CONTRACT_ADDRESS, Supabase service role in env.
 *
 * Usage: npm run reconcile:ownership
 */
import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { ethers } from "ethers";
import { createSupabaseAdmin } from "../src/lib/supabase-admin";

const ERC721_OWNER_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
];

async function main() {
  const rpc = process.env.CHAIN_RPC_URL;
  const nft = process.env.NFT_CONTRACT_ADDRESS;
  if (!rpc || !nft) {
    console.error("Set CHAIN_RPC_URL and NFT_CONTRACT_ADDRESS");
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(nft, ERC721_OWNER_ABI, provider);

  const sb = createSupabaseAdmin();
  const { data: rows, error } = await sb.from("ownership_cache").select(
    "id, owner_address, article_id, token_id"
  );

  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log("ownership_cache: no rows");
    return;
  }

  let mismatches = 0;
  for (const row of rows) {
    const tid = row.token_id as string;
    if (tid.startsWith("mock-")) {
      console.log(`[skip] mock token_id=${tid}`);
      continue;
    }
    try {
      const onChain = await contract.ownerOf(tid);
      const cached = (row.owner_address as string).toLowerCase();
      const live = onChain.toLowerCase();
      if (cached !== live) {
        mismatches++;
        console.warn(
          `[mismatch] token_id=${tid} cache=${cached} chain=${live} article_id=${row.article_id}`
        );
      }
    } catch (e) {
      mismatches++;
      console.warn(
        `[error] token_id=${tid}`,
        e instanceof Error ? e.message : e
      );
    }
  }

  console.log(
    `Done. Rows=${rows.length} mismatches_or_errors=${mismatches}`
  );
  process.exit(mismatches > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
