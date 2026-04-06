/**
 * Local smoke: sign EIP-191 message, optionally seed ownership_cache, print JSON body for curl.
 * Usage:
 *   npx tsx scripts/smoke-get-article-content.ts
 *   curl -sS -X POST http://127.0.0.1:3000/api/get-article-content \
 *     -H "Content-Type: application/json" -d "$(npx tsx scripts/smoke-get-article-content.ts --print-body)"
 *
 * Default article id matches supabase/seed.sql MVP placeholder.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Wallet } from "ethers";
import {
  encryptArticleUtf8,
  envelopeToStoredJson,
} from "../src/lib/article-crypto";
import { articleAccessMessage } from "../src/lib/wallet-auth";

config({ path: ".env.local" });

/** Matches [`supabase/seed.sql`](../../supabase/seed.sql) dev sample when using the all-zero key. */
const DEV_PLAINTEXT_BODY = "MVP dev placeholder article body";

const DEV_ZERO_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

function loadContentKey(): Buffer {
  const hex = process.env.ARTICLE_CONTENT_KEY?.trim() || DEV_ZERO_KEY;
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "ARTICLE_CONTENT_KEY must be 64 hex characters when set"
    );
  }
  return Buffer.from(hex, "hex");
}

const ARTICLE_ID =
  process.env.MVP_DEFAULT_ARTICLE_ID ??
  "11111111-1111-4111-8111-111111111111";

async function main() {
  const printBodyOnly = process.argv.includes("--print-body");
  const w = Wallet.createRandom();
  const msg = articleAccessMessage(ARTICLE_ID, w.address);
  const signature = await w.signMessage(msg);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const contentKey = loadContentKey();
    const envelope = encryptArticleUtf8(DEV_PLAINTEXT_BODY, contentKey);
    const storedJson = envelopeToStoredJson(envelope);
    const { error: artErr } = await sb.from("articles").upsert(
      {
        id: ARTICLE_ID,
        title: "MVP dev placeholder article",
        encrypted_content: storedJson,
        price: 0,
        cover_url: null,
      },
      { onConflict: "id" }
    );
    if (artErr) {
      console.error("[smoke] articles upsert:", artErr.message);
    }
    const { error } = await sb.from("ownership_cache").upsert(
      {
        owner_address: w.address,
        article_id: ARTICLE_ID,
        token_id: "smoke-curl-local",
        source: "SYNC",
        last_updated: new Date().toISOString(),
      },
      { onConflict: "article_id,token_id" }
    );
    if (error) {
      console.error("[smoke] ownership_cache upsert:", error.message);
    } else if (!printBodyOnly) {
      console.error("[smoke] seeded ownership_cache for", w.address);
    }
  } else if (!printBodyOnly) {
    console.error(
      "[smoke] skip cache seed: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (expect 403)"
    );
  }

  const body = JSON.stringify({
    articleId: ARTICLE_ID,
    address: w.address,
    signature,
  });
  if (printBodyOnly) {
    process.stdout.write(body);
  } else {
    console.log(body);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
