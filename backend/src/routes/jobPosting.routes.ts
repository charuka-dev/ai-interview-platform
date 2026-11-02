import type { FastifyInstance } from "fastify";
import prisma from "../prisma/client.js";
import { authenticate } from "../middleware/auth.js";

const createSchema = {
  body: {
    type: "object",
    required: ["jobRole", "jobDescription"],
    additionalProperties: false,
    properties: {
      jobRole: { type: "string", minLength: 1, maxLength: 200 },
      jobDescription: { type: "string", maxLength: 50000 },
    },
  },
} as const;

export async function jobPostingRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/job-postings
   */
  app.post(
    "/",
    { schema: createSchema, preHandler: [authenticate] },
    async (request, reply) => {
      const { jobRole, jobDescription } = request.body as {
        jobRole: string;
        jobDescription: string;
      };
      const userId = request.user.sub;

      // Simple heuristic parsing: extract key requirement phrases
      // A more thorough parse happens during session creation via RubricService
      const parsedRequirements = extractRequirements(jobDescription);

      const posting = await prisma.jobPosting.create({
        data: {
          userId,
          jobRole,
          jobDescription,
          parsedRequirements,
        },
        select: {
          id: true,
          jobRole: true,
          jobDescription: true,
          parsedRequirements: true,
          createdAt: true,
        },
      });

      return reply.code(201).send(posting);
    }
  );

  /**
   * GET /api/job-postings/:id
   */
  app.get(
    "/:id",
    {
      schema: { params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.sub;

      const posting = await prisma.jobPosting.findFirst({
        where: { id, userId },
        select: {
          id: true,
          jobRole: true,
          jobDescription: true,
          parsedRequirements: true,
          createdAt: true,
        },
      });

      if (!posting) {
        return reply.code(404).send({ error: "NotFound", message: "Job posting not found" });
      }

      return reply.send(posting);
    }
  );
}

/**
 * Lightweight heuristic extraction — splits JD into bullet-style requirements.
 * More sophisticated parsing is done in the scoring pipeline via Gemini.
 */
function extractRequirements(jd: string): { requirements: string[] } {
  const lines = jd
    .split(/\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 20 && l.length < 300);

  return { requirements: lines.slice(0, 30) };
}
