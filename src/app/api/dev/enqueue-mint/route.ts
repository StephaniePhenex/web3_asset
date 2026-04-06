import { NextResponse } from "next/server";
import { getMintQueue } from "@/lib/queues/mint-queue";

/**
 * Development-only: enqueue a mint job for manual testing.
 * Disabled in production builds.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body ok */
  }

  const paymentId =
    typeof body.paymentId === "string"
      ? body.paymentId
      : `dev-${Date.now()}`;
  const userAddress =
    typeof body.userAddress === "string"
      ? body.userAddress
      : "0x0000000000000000000000000000000000000001";
  const articleId =
    typeof body.articleId === "string"
      ? body.articleId
      : "00000000-0000-0000-0000-000000000000";

  const queue = getMintQueue();
  const job = await queue.add("mint", {
    paymentId,
    userAddress,
    articleId,
  });

  return NextResponse.json({
    jobId: job.id,
    queue: "mint-tasks",
  });
}
