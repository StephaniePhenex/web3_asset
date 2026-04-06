import IORedis from "ioredis";

/**
 * BullMQ requires ioredis with maxRetriesPerRequest: null.
 * Use a dedicated connection per Queue / Worker instance (BullMQ recommendation).
 * @see https://docs.bullmq.io/guide/connections
 */
export function createRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set (e.g. redis://127.0.0.1:6379)");
  }
  return new IORedis(url, {
    maxRetriesPerRequest: null,
  });
}
