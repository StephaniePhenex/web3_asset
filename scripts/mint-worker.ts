import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../src/lib/redis-connection";
import {
  MINT_QUEUE_NAME,
  type MintJobPayload,
} from "../src/lib/queues/mint-queue";

const connection = createRedisConnection();

const worker = new Worker<MintJobPayload>(
  MINT_QUEUE_NAME,
  async (job: Job<MintJobPayload>) => {
    console.log("[mint-worker] job", job.id, job.name, JSON.stringify(job.data));
    return { ok: true, processedAt: Date.now() };
  },
  {
    connection,
    concurrency: 1,
    limiter: { max: 5, duration: 1000 },
  }
);

worker.on("failed", (job, err) => {
  console.error("[mint-worker] failed", job?.id, err);
});

async function shutdown() {
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

console.log(`[mint-worker] listening on queue "${MINT_QUEUE_NAME}"`);
