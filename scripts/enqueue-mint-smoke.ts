import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { getMintQueue } from "../src/lib/queues/mint-queue";

async function main() {
  const queue = getMintQueue();
  const job = await queue.add("mint", {
    paymentId: `smoke-${Date.now()}`,
    userAddress: "0x0000000000000000000000000000000000000001",
    articleId: "00000000-0000-0000-0000-000000000000",
  });
  console.log("[enqueue-mint-smoke] added job id:", job.id);
  await queue.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
