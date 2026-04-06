/**
 * Encrypt UTF-8 plaintext to the v1 AES-GCM JSON envelope (stdout).
 * Requires ARTICLE_CONTENT_KEY (64 hex chars) or uses dev all-zero key when unset.
 *
 * Usage:
 *   ARTICLE_CONTENT_KEY=... npx tsx scripts/encrypt-article-body.ts "Hello"
 *   echo "secret" | ARTICLE_CONTENT_KEY=... npx tsx scripts/encrypt-article-body.ts
 */
import { config } from "dotenv";
import {
  encryptArticleUtf8,
  envelopeToStoredJson,
} from "../src/lib/article-crypto";
import { getContentKeySource, litKeyStubMessage } from "../src/lib/content-key-source";

config({ path: ".env.local" });

const DEV_ZERO_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

function loadKey(): Buffer {
  const hex = process.env.ARTICLE_CONTENT_KEY?.trim() || DEV_ZERO_KEY;
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "ARTICLE_CONTENT_KEY must be 64 hex characters (or omit for dev zero key)"
    );
  }
  return Buffer.from(hex, "hex");
}

async function main() {
  const arg = process.argv.slice(2).join(" ").trim();
  let plain: string;
  if (arg) {
    plain = arg;
  } else {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) {
      chunks.push(c as Buffer);
    }
    plain = Buffer.concat(chunks).toString("utf8").trimEnd();
  }
  if (!plain) {
    console.error("Usage: provide plaintext as argv or stdin");
    process.exit(1);
  }
  if (getContentKeySource() === "lit-stub") {
    console.warn("[encrypt-article-body]", litKeyStubMessage());
  }
  const key = loadKey();
  const env = encryptArticleUtf8(plain, key);
  console.log(envelopeToStoredJson(env));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
