import { Queue } from "bullmq";
import { createRedisConnection } from "@/lib/redis-connection";

/** Queue name for CAP Mint_Task pipeline (BullMQ identifier). */
export const MINT_QUEUE_NAME = "mint-tasks";

export type MintJobPayload = {
  paymentId: string;
  userAddress: string;
  articleId: string;
};

let queue: Queue | null = null;

/**
 * Singleton mint queue. Throughput: **5 jobs/sec** enforced on the Worker (`scripts/mint-worker.ts`), not here (BullMQ v5).
 */
export function getMintQueue(): Queue {
  if (!queue) {
    queue = new Queue(MINT_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return queue;
}
