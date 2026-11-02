import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import prisma from "../prisma/client.js";
import { getQueue } from "../queue/index.js";

const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? "";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/webhooks/vapi
   *
   * Security model:
   * 1. Verify Bearer Token from the Authorization header against VAPI_WEBHOOK_SECRET
   * 2. Acknowledge with 200 immediately after persisting transcript
   * 3. Enqueue scoring job — NEVER call Gemini inline here
   */
  app.post(
    "/vapi",
    {
      config: {
        // Disable the global rate limit for webhooks — Vapi sends these server-side
        rateLimit: { max: 1000, timeWindow: 60000 },
      },
    },
    async (request, reply) => {
      // ── 1. Bearer Token Verification ──────────────────────────────────────
      const authHeader = request.headers["authorization"] as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized", message: "Missing or malformed Authorization header" });
      }

      const incomingToken = authHeader.slice("Bearer ".length);

      // Constant-time comparison to prevent timing attacks
      const incomingBuffer = Buffer.from(incomingToken);
      const expectedBuffer = Buffer.from(VAPI_WEBHOOK_SECRET);
      if (
        incomingBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(incomingBuffer, expectedBuffer)
      ) {
        request.log.warn("Vapi webhook Bearer Token mismatch — rejected");
        return reply.code(401).send({ error: "Unauthorized", message: "Invalid token" });
      }

      // ── 2. Parse event ────────────────────────────────────────────────────
      const event = request.body as VapiWebhookEvent;
      const msg = event.message;
      request.log.info({ type: msg.type, callId: msg.call?.id }, "Vapi webhook received");

      if (msg.type !== "end-of-call-report") {
        // ACK all other event types silently
        return reply.send({ received: true });
      }

      const vapiCallId = msg.call?.id;
      if (!vapiCallId) {
        return reply.code(400).send({ error: "BadRequest", message: "Missing call ID in event" });
      }

      // ── 3. Find the matching session ──────────────────────────────────────
      // First try to match by vapiCallId (most specific), then by assistantId
      const session = await prisma.interviewSession.findFirst({
        where: {
          OR: [
            { vapiCallId: vapiCallId },
            { vapiAssistantId: msg.call.assistantId },
          ],
        },
        select: { id: true, userId: true },
      });

      if (!session) {
        request.log.warn({ vapiCallId }, "No session found for Vapi call — ignoring");
        return reply.send({ received: true });
      }

      // ── 4. Persist transcript + recording, update session ─────────────────
      const transcript = msg.artifact?.transcript ?? msg.transcript ?? "";
      const recordingUrl = msg.artifact?.recordingUrl ?? msg.recordingUrl ?? null;

      await prisma.$transaction(async (tx) => {
        await tx.transcript.upsert({
          where: { sessionId: session.id },
          create: {
            sessionId: session.id,
            fullText: transcript,
            recordingKey: recordingUrl,
          },
          update: {
            fullText: transcript,
            recordingKey: recordingUrl,
          },
        });

        await tx.interviewSession.update({
          where: { id: session.id },
          data: {
            vapiCallId,
            status: "processing",
            startedAt: msg.startedAt ? new Date(msg.startedAt) : undefined,
            endedAt: msg.endedAt ? new Date(msg.endedAt) : undefined,
            durationSec: msg.durationSeconds ?? null,
          },
        });
      });

      // ── 5. ACK immediately — do NOT await scoring ──────────────────────────
      reply.send({ received: true });

      // ── 6. Enqueue scoring job (async, after response sent) ───────────────
      const queue = getQueue();
      await queue.add("score-session", { sessionId: session.id, userId: session.userId });
    }
  );
}

// ── Vapi Webhook Payload Types ────────────────────────────────────────────────
interface VapiWebhookEvent {
  message: {
    type: string;
    endedReason?: string;
    transcript?: string;
    recordingUrl?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    call: {
      id: string;
      assistantId: string;
    };
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
    };
  };
}
