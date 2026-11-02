/**
 * rescoreSession.ts — One-off script to re-enqueue a scoring job for a
 * session that already has a transcript but failed scoring (e.g. due to an
 * invalid GEMINI_PRO_MODEL value).
 *
 * Usage:
 *   npx tsx scripts/rescoreSession.ts <sessionId>
 *
 * The script only ENQUEUES the job — your running server's worker picks it up
 * and executes the full scoring pipeline unchanged (scoringWorker.ts).
 *
 * Requirements:
 *   - REDIS_URL must be set in .env (BullMQ mode)
 *   - The session must exist in the database and have a transcript
 *   - Your backend server (with the worker) should be running, OR you can
 *     run this script while the server is down and it will be processed on
 *     next server start (BullMQ persists jobs in Redis)
 */

import "dotenv/config";
import { Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";

const sessionId = process.argv[2];

if (!sessionId) {
  console.error("Usage: npx tsx scripts/rescoreSession.ts <sessionId>");
  process.exit(1);
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error(
    "Error: REDIS_URL is not set in .env.\n" +
    "This script requires BullMQ (Redis). " +
    "If you are running in dev without Redis, start your server instead " +
    "and trigger scoring via the webhook."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // ── 1. Verify the session exists and has a transcript ──────────────────────
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      transcript: { select: { id: true } },
    },
  });

  if (!session) {
    console.error(`Error: Session "${sessionId}" not found in the database.`);
    process.exit(1);
  }

  if (!session.transcript) {
    console.error(
      `Error: Session "${sessionId}" has no transcript yet — cannot score.\n` +
      "Wait for the Vapi end-of-call-report webhook to deliver the transcript."
    );
    process.exit(1);
  }

  console.log(
    `Session found — status: ${session.status}, userId: ${session.userId}`
  );

  if (session.status === "completed") {
    console.warn(
      "Warning: This session is already 'completed'. Re-enqueueing will create " +
      "a duplicate Score record. Continue? (Ctrl-C to abort, Enter to proceed)"
    );
    await new Promise((resolve) => process.stdin.once("data", resolve));
  }

  // ── 2. Reset session status to "processing" so the frontend doesn't show ──
  //       a stale "failed" state while the job runs
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status: "processing" },
  });
  console.log(`Session status reset to "processing".`);

  // ── 3. Enqueue the scoring job — same payload as webhook.routes.ts ─────────
  //       Use the Queue class directly (producer only, no worker started here).
  const queue = new Queue("interview-jobs", {
    connection: { url: redisUrl },
  });

  await queue.add("score-session", {
    sessionId: session.id,
    userId: session.userId,
  });

  console.log(
    `✓ Job enqueued: score-session { sessionId: "${sessionId}", userId: "${session.userId}" }\n` +
    `  Your server's BullMQ worker will pick this up and run the full scoring pipeline.`
  );

  await queue.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  prisma.$disconnect();
  process.exit(1);
});
