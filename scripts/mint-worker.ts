import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../src/lib/redis-connection";
import {
  MINT_QUEUE_NAME,
  type MintJobPayload,
} from "../src/lib/queues/mint-queue";
import { mockMintResult, mintArticleNft } from "../src/lib/mint-onchain";
import {
  findOrderIdByPaymentId,
  updateOrder,
} from "../src/lib/orders-worker";

const connection = createRedisConnection();

const worker = new Worker<MintJobPayload>(
  MINT_QUEUE_NAME,
  async (job: Job<MintJobPayload>) => {
    const { paymentId, userAddress, articleId } = job.data;
    const orderId =
      job.data.orderId ?? (await findOrderIdByPaymentId(paymentId));

    if (orderId) {
      await updateOrder(orderId, { status: "PROCESSING", failure_reason: null });
    }

    const mode = (process.env.MINT_MODE ?? "mock").toLowerCase();
    let result: { txHash: string; tokenId: string };

    if (mode === "chain") {
      result = await mintArticleNft({
        toAddress: userAddress,
        articleId,
        paymentId,
      });
    } else {
      result = mockMintResult(paymentId, job.id ?? undefined);
    }

    if (orderId) {
      await updateOrder(orderId, {
        status: "COMPLETED",
        tx_hash: result.txHash,
        token_id: result.tokenId,
        failure_reason: null,
      });
    }

    console.log(
      "[mint-worker] completed",
      job.id,
      mode,
      result.txHash,
      result.tokenId
    );
    return result;
  },
  {
    connection,
    concurrency: 1,
    limiter: { max: 5, duration: 1000 },
  }
);

worker.on("failed", async (job, err) => {
  console.error("[mint-worker] failed", job?.id, err);
  if (!job) {
    return;
  }
  const maxAttempts = job.opts.attempts ?? 5;
  if (!job.finishedOn && job.attemptsMade < maxAttempts) {
    return;
  }
  const orderId =
    job.data.orderId ?? (await findOrderIdByPaymentId(job.data.paymentId));
  if (!orderId) {
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  try {
    await updateOrder(orderId, {
      status: "FAILED",
      failure_reason: msg.slice(0, 2000),
    });
  } catch (e) {
    console.error("[mint-worker] could not persist failure_reason", e);
  }
});

async function shutdown() {
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

console.log(
  `[mint-worker] listening on "${MINT_QUEUE_NAME}" (MINT_MODE=${process.env.MINT_MODE ?? "mock"})`
);
