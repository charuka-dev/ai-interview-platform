import type { FastifyInstance } from "fastify";
import prisma from "../prisma/client.js";
import { authenticate } from "../middleware/auth.js";
import { rubricService } from "../services/rubricService.js";
import { vapiService } from "../services/vapiService.js";

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_SESSIONS_MAX ?? "10", 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_SESSIONS_WINDOW_MS ?? "3600000", 10);

const createSessionSchema = {
  body: {
    type: "object",
    required: ["jobPostingId"],
    additionalProperties: false,
    properties: {
      jobPostingId: { type: "string", minLength: 1 },
      resumeId: { type: "string", minLength: 1 },
    },
  },
} as const;

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/sessions
   *
   * Full session creation flow:
   * 1. Load job posting + resume
   * 2. Select rubric via RubricService
   * 3. Build Vapi system prompt
   * 4. Create Vapi assistant via REST API
   * 5. Persist session with vapiAssistantId
   * 6. Return session + assistantId to frontend
   */
  app.post(
    "/",
    {
      schema: createSessionSchema,
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: RATE_LIMIT_MAX,
          timeWindow: RATE_LIMIT_WINDOW,
        },
      },
    },
    async (request, reply) => {
      const { jobPostingId, resumeId } = request.body as {
        jobPostingId: string;
        resumeId?: string;
      };
      const userId = request.user.sub;

      // ── 1. Load job posting ──────────────────────────────────────────────
      const jobPosting = await prisma.jobPosting.findFirst({
        where: { id: jobPostingId, userId },
      });
      if (!jobPosting) {
        return reply.code(404).send({ error: "NotFound", message: "Job posting not found" });
      }

      // ── 2. Load resume (optional) ────────────────────────────────────────
      let resume = null;
      if (resumeId) {
        resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
        if (!resume) {
          return reply.code(404).send({ error: "NotFound", message: "Resume not found" });
        }
      }

      // ── 3. Select rubric ──────────────────────────────────────────────────
      const { rubric, rubricName } = rubricService.getRubric(jobPosting.jobRole);
      const commonRubric = rubricService.getCommonRubric();

      // ── 4. Build Vapi system prompt ───────────────────────────────────────
      const systemPrompt = rubricService.buildVapiSystemPrompt(
        rubric,
        resume
          ? {
              skills: resume.parsedSkills,
              experience: resume.parsedExperience,
              rawText: resume.parsedRawText ?? "",
            }
          : null,
        jobPosting.jobDescription,
        commonRubric
      );

      // ── 5. Create Vapi assistant ──────────────────────────────────────────
      const assistant = await vapiService.createAssistant({
        name: `Interview — ${jobPosting.jobRole}`,
        systemPrompt,
        firstMessage: `Hi! Thanks for joining today. Before we dive into the technical questions, I'd love to hear a bit about yourself — could you introduce yourself and walk me through your background?`,
      });

      // ── 6. Persist session ────────────────────────────────────────────────
      const session = await prisma.interviewSession.create({
        data: {
          userId,
          jobPostingId,
          resumeId: resumeId ?? null,
          vapiAssistantId: assistant.id,
          rubricName,
          status: "created",
        },
        select: {
          id: true,
          status: true,
          vapiAssistantId: true,
          rubricName: true,
          createdAt: true,
        },
      });

      return reply.code(201).send(session);
    }
  );

  /**
   * GET /api/sessions/:id
   */
  app.get(
    "/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.sub;

      const session = await prisma.interviewSession.findFirst({
        where: { id, userId },
        select: {
          id: true,
          status: true,
          vapiAssistantId: true,
          vapiCallId: true,
          rubricName: true,
          startedAt: true,
          endedAt: true,
          durationSec: true,
          createdAt: true,
          jobPosting: { select: { jobRole: true } },
        },
      });

      if (!session) {
        return reply.code(404).send({ error: "NotFound", message: "Session not found" });
      }

      return reply.send(session);
    }
  );

  /**
   * GET /api/sessions/:id/score
   * Returns 202 while processing, 200 with score when completed.
   */
  app.get(
    "/:id/score",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.sub;

      const session = await prisma.interviewSession.findFirst({
        where: { id, userId },
        select: {
          status: true,
          transcript: {
            select: { fullText: true },
          },
          score: {
            select: {
              id: true,
              technicalAccuracy: true,
              communication: true,
              confidence: true,
              reasoning: true,
              improvementTips: true,
              createdAt: true,
            },
          },
        },
      });

      if (!session) {
        return reply.code(404).send({ error: "NotFound", message: "Session not found" });
      }

      if (session.status === "processing" || session.status === "in_progress") {
        return reply.code(202).send({
          status: session.status,
          message: "Scoring is still in progress. Poll again shortly.",
        });
      }

      if (session.status === "failed") {
        return reply.code(500).send({ status: "failed", message: "Scoring failed. Contact support." });
      }

      if (!session.score) {
        return reply.code(202).send({ status: session.status, message: "Score not yet available." });
      }

      return reply.send({
        status: "completed",
        score: {
          ...session.score,
          transcript: session.transcript?.fullText,
        },
      });
    }
  );
}
