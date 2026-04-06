import { ethers } from "ethers";

/** Message the client must sign (EIP-191 personal_sign). */
export function articleAccessMessage(articleId: string, walletAddress: string): string {
  return `CAP:article:${articleId}:${walletAddress}`;
}

/**
 * Verifies `signature` is from `walletAddress` over {@link articleAccessMessage}.
 */
export function verifyArticleAccessSignature(
  articleId: string,
  walletAddress: string,
  signature: string
): boolean {
  let expected: string;
  try {
    expected = ethers.utils.getAddress(walletAddress);
  } catch {
    return false;
  }
  const message = articleAccessMessage(articleId, expected);
  let recovered: string;
  try {
    recovered = ethers.utils.verifyMessage(message, signature);
  } catch {
    return false;
  }
  return recovered.toLowerCase() === expected.toLowerCase();
}
