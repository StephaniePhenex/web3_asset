import { createHash } from "node:crypto";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

export type MintResult = {
  txHash: string;
  tokenId: string;
};

/**
 * Deterministic placeholder tx hash for MINT_MODE=mock (no gas).
 */
export function mockMintResult(paymentId: string, jobNumericId: string | undefined): MintResult {
  const h = createHash("sha256").update(`mock:${paymentId}:${jobNumericId ?? "0"}`).digest("hex");
  return {
    txHash: `0x${h}`,
    tokenId: `mock-${jobNumericId ?? "0"}`,
  };
}

/**
 * Real ERC-721 mint via Thirdweb (deployed **nft-collection** or override `NFT_CONTRACT_TYPE`).
 * Requires: THIRDWEB_PRIVATE_KEY, CHAIN_RPC_URL, NFT_CONTRACT_ADDRESS.
 */
export async function mintArticleNft(params: {
  toAddress: string;
  articleId: string;
  paymentId: string;
}): Promise<MintResult> {
  const pk = process.env.THIRDWEB_PRIVATE_KEY;
  const rpc = process.env.CHAIN_RPC_URL;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  if (!pk || !rpc || !contractAddress) {
    throw new Error(
      "mintArticleNft: set THIRDWEB_PRIVATE_KEY, CHAIN_RPC_URL, and NFT_CONTRACT_ADDRESS"
    );
  }

  const sdk = ThirdwebSDK.fromPrivateKey(pk, rpc);
  const contractType = process.env.NFT_CONTRACT_TYPE ?? "nft-collection";
  const contract = await sdk.getContract(
    contractAddress,
    contractType as "nft-collection"
  );

  const tx = await contract.erc721.mintTo(params.toAddress, {
    name: `CAP Article ${params.articleId.slice(0, 8)}`,
    description: `payment ${params.paymentId}`,
  });

  const receipt = tx.receipt;
  const txHash = receipt?.transactionHash ?? "";
  const tokenId = String(tx.id);
  if (!txHash) {
    throw new Error("mintArticleNft: missing transaction hash in receipt");
  }
  return { txHash, tokenId };
}
