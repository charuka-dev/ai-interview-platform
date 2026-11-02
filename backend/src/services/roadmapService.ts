import prisma from "../prisma/client.js";
import { geminiService } from "./geminiService.js";

const ROADMAP_THRESHOLD = parseInt(process.env.ROADMAP_SESSION_THRESHOLD ?? "3", 10);

/**
 * RoadmapService — synthesizes improvement roadmaps after enough sessions.
 *
 * Trigger: every Nth completed session (globally per user, across all roles).
 * Uses Gemini Pro to analyse score trends and produce a personalized roadmap.
 */
export const roadmapService = {
  /**
   * Check if this user has hit the session threshold, and if so,
   * generate and upsert a new ImprovementRoadmap.
   *
   * Designed to be called from the scoring worker after a score is saved.
   * Failures here are non-fatal — the session score is already persisted.
   */
  async maybeUpdateRoadmap(userId: string): Promise<void> {
    const completedCount = await prisma.interviewSession.count({
      where: { userId, status: "completed" },
    });

    // Only generate on every Nth session (3, 6, 9, …)
    if (completedCount === 0 || completedCount % ROADMAP_THRESHOLD !== 0) {
      return;
    }

    // Fetch the last N*2 scores (to give Gemini meaningful trend data)
    const recentSessions = await prisma.interviewSession.findMany({
      where: { userId, status: "completed", score: { isNot: null } },
      orderBy: { endedAt: "desc" },
      take: ROADMAP_THRESHOLD * 2,
      select: {
        jobPosting: { select: { jobRole: true } },
        score: {
          select: {
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

    if (recentSessions.length === 0) return;

    // Build a compact text summary of scores for the Gemini prompt
    const scoreSummaries = recentSessions
      .map((s, i) => {
        const sc = s.score!;
        return `Session ${i + 1} (${s.jobPosting?.jobRole ?? "Unknown Role"}):
  Technical: ${sc.technicalAccuracy}, Communication: ${sc.communication}, Confidence: ${sc.confidence}
  Tips: ${(sc.improvementTips as string[]).slice(0, 3).join("; ")}`;
      })
      .join("\n\n");

    const jobRoles = [
      ...new Set(
        recentSessions
          .map((s) => s.jobPosting?.jobRole)
          .filter(Boolean) as string[]
      ),
    ];

    const roadmapData = await geminiService.synthesizeRoadmap(scoreSummaries, jobRoles);

    await prisma.improvementRoadmap.create({
      data: {
        userId,
        focusAreas: roadmapData.focusAreas as object,
        resources: roadmapData.resources as object,
      },
    });
  },
};
