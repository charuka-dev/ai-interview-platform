import prisma from "../prisma/client.js";
import { geminiService } from "../services/geminiService.js";
import { rubricService } from "../services/rubricService.js";
import { roadmapService } from "../services/roadmapService.js";

export interface ScoringJobData {
  sessionId: string;
  userId: string;
}

/**
 * Scoring Worker — background job handler for post-interview evaluation.
 *
 * Pipeline:
 * 1. Load session + transcript + rubric context
 * 2. Build scoring prompt via RubricService
 * 3. Call Gemini Pro (not Flash) for evaluation
 * 4. Persist Score record, set session status = "completed"
 * 5. Check if roadmap should be regenerated (every Nth session)
 *
 * This function is the single source of truth for the scoring pipeline.
 * It is called by both BullMQQueue (production) and InProcessQueue (dev).
 */
export async function scoringJobHandler(
  jobName: string,
  data: unknown
): Promise<void> {
  if (jobName !== "score-session") {
    console.warn(`[ScoringWorker] Unknown job name: ${jobName} — skipping`);
    return;
  }

  const { sessionId, userId } = data as ScoringJobData;
  console.info(`[ScoringWorker] Starting scoring for session ${sessionId}`);

  try {
    // ── 1. Load all required data ──────────────────────────────────────────
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        transcript: true,
        jobPosting: true,
        resume: true,
      },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.transcript) {
      throw new Error(`Session ${sessionId} has no transcript — cannot score`);
    }

    // ── 2. Load rubric ──────────────────────────────────────────────────────
    const jobRole = session.jobPosting?.jobRole ?? "General";
    const { rubric } = rubricService.getRubric(jobRole);

    const resumeContext = session.resume
      ? {
          skills: session.resume.parsedSkills,
          experience: session.resume.parsedExperience,
          rawText: session.resume.parsedRawText ?? "",
        }
      : null;

    // ── 3. Handle Empty Transcript ─────────────────────────────────────────
    if (!session.transcript.fullText || session.transcript.fullText.trim().length === 0) {
      console.warn(`[ScoringWorker] Transcript is empty for session ${sessionId}, assigning 0 scores.`);
      await prisma.$transaction(async (tx) => {
        await tx.score.create({
          data: {
            sessionId,
            technicalAccuracy: 0,
            communication: 0,
            confidence: 0,
            reasoning: {
              technicalAccuracy: "No transcript recorded.",
              communication: "No transcript recorded.",
              confidence: "No transcript recorded.",
            },
            improvementTips: ["Complete an interview to receive feedback."],
          },
        });
        await tx.interviewSession.update({
          where: { id: sessionId },
          data: { status: "completed" },
        });
      });
      return;
    }

    // ── 4. Build prompt ────────────────────────────────────────────────────
    const scoringPrompt = rubricService.buildScoringPrompt(
      rubric,
      session.transcript.fullText,
      resumeContext,
      session.jobPosting?.jobDescription ?? ""
    );

    // ── 4. Call Gemini Pro for scoring ─────────────────────────────────────
    const result = await geminiService.scoreInterview(scoringPrompt);

    // ── 5. Validate score ranges ───────────────────────────────────────────
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

    // ── 6. Persist score + update session status in a transaction ──────────
    await prisma.$transaction(async (tx) => {
      await tx.score.create({
        data: {
          sessionId,
          technicalAccuracy: clamp(result.technicalAccuracy),
          communication: clamp(result.communication),
          confidence: clamp(result.confidence),
          reasoning: result.reasoning as object,
          improvementTips: result.improvementTips as object,
        },
      });

      await tx.interviewSession.update({
        where: { id: sessionId },
        data: { status: "completed" },
      });
    });

    console.info(
      `[ScoringWorker] Session ${sessionId} scored: ` +
        `tech=${clamp(result.technicalAccuracy)}, ` +
        `comm=${clamp(result.communication)}, ` +
        `conf=${clamp(result.confidence)}`
    );

    // ── 7. Maybe regenerate roadmap (non-fatal if it fails) ────────────────
    try {
      await roadmapService.maybeUpdateRoadmap(userId);
    } catch (roadmapErr) {
      console.warn(
        `[ScoringWorker] Roadmap update failed (non-fatal) for user ${userId}:`,
        (roadmapErr as Error).message
      );
    }
  } catch (err) {
    const error = err as Error;
    console.error(`[ScoringWorker] Scoring failed for session ${sessionId}:`, error.message);

    // Mark session as failed so the frontend can show an error state
    await prisma.interviewSession
      .update({
        where: { id: sessionId },
        data: { status: "failed" },
      })
      .catch(() => {
        // Don't throw if status update also fails
      });

    // Re-throw so BullMQ can retry
    throw err;
  }
}
