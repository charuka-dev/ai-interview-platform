import type { FastifyInstance } from "fastify";
import prisma from "../prisma/client.js";
import { authenticate } from "../middleware/auth.js";
import { storageService } from "../services/storageService.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/users/me/history
   * Returns all sessions for the authenticated user, with scores where available.
   */
  app.get(
    "/me/history",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const sessions = await prisma.interviewSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          rubricName: true,
          startedAt: true,
          endedAt: true,
          durationSec: true,
          createdAt: true,
          jobPosting: {
            select: { jobRole: true },
          },
          score: {
            select: {
              technicalAccuracy: true,
              communication: true,
              confidence: true,
              createdAt: true,
            },
          },
        },
      });

      // Build score trend data
      const trend = sessions
        .filter((s) => s.score)
        .map((s) => ({
          sessionId: s.id,
          date: s.score!.createdAt,
          role: s.jobPosting?.jobRole,
          technical: s.score!.technicalAccuracy,
          communication: s.score!.communication,
          confidence: s.score!.confidence,
          overall: Math.round(
            (s.score!.technicalAccuracy + s.score!.communication + s.score!.confidence) / 3
          ),
        }));

      return reply.send({ sessions, trend });
    }
  );

  /**
   * GET /api/users/me/roadmap
   * Returns the latest improvement roadmap for the authenticated user.
   */
  app.get(
    "/me/roadmap",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const roadmap = await prisma.improvementRoadmap.findFirst({
        where: { userId },
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          generatedAt: true,
          focusAreas: true,
          resources: true,
        },
      });

      if (!roadmap) {
        return reply.send({
          focusAreas: [],
          resources: [],
        });
      }

      return reply.send(roadmap);
    }
  );
}
