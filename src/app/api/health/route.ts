import { NextResponse } from "next/server";
import { createRedisConnection } from "@/lib/redis-connection";

export async function GET() {
  try {
    const redis = createRedisConnection();
    const pong = await redis.ping();
    await redis.quit();
    return NextResponse.json({ ok: true, redis: pong });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { ok: false, redis: message },
      { status: 503 }
    );
  }
}
