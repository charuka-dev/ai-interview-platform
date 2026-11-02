import fs from "fs";
import path from "path";

/**
 * RubricService — loads domain-specific rubric files and builds
 * prompts that inject rubric context into both Vapi (live interview)
 * and Gemini Pro (scoring).
 *
 * This is the core differentiation from bare API calls:
 * structured domain knowledge shapes every interview and every score.
 */

// Resolve rubrics directory relative to project root (works in both CJS and ESM)
const RUBRICS_DIR =
  process.env.RUBRICS_DIR ??
  path.resolve(process.cwd(), "src", "rubrics");

// ── Alias map: canonical substrings → rubric filename (no .json) ──────────────
// Keys are matched as substrings of the normalised job title.
// When multiple keys match, the longest (most specific) wins.
const ALIASES: Record<string, string> = {
  "sre": "devops-engineer",
  "site reliability": "devops-engineer",
  "devops": "devops-engineer",
  "sdet": "qa-engineer",
  "qa automation": "qa-engineer",
  "test automation": "qa-engineer",
  "dba": "database-administrator",
  "database admin": "database-administrator",
  "ios": "mobile-developer",
  "android": "mobile-developer",
  "flutter": "mobile-developer",
  "react native": "mobile-developer",
  "mobile app": "mobile-developer",
  "mern": "fullstack-javascript",
  "mean stack": "fullstack-javascript",
  "full stack": "fullstack-javascript",
  "fullstack": "fullstack-javascript",
  "ml engineer": "ml-engineer",
  "machine learning engineer": "ml-engineer",
  "ai engineer": "ml-engineer",
  "ai/ml": "ml-engineer",
  "computer vision": "ml-engineer",
  "nlp": "data-scientist",
  "data analyst": "data-scientist",
  "data scientist": "data-scientist",
  "data engineer": "data-engineer",
  "etl": "data-engineer",
  "security engineer": "cybersecurity-engineer",
  "appsec": "cybersecurity-engineer",
  "application security": "cybersecurity-engineer",
  "cybersecurity": "cybersecurity-engineer",
  "penetration test": "cybersecurity-engineer",
  "cloud architect": "cloud-engineer",
  "cloud engineer": "cloud-engineer",
  "solutions architect": "cloud-engineer",
  "aws engineer": "cloud-engineer",
};

// ── Stopwords: generic seniority/role noise that pollutes Jaccard scores ───────
const STOPWORDS = new Set([
  "engineer", "engineering", "developer", "development", "programmer",
  "senior", "sr", "junior", "jr", "lead", "staff", "principal",
  "i", "ii", "iii", "iv", "1", "2", "3",
]);


// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalibrationExample {
  answer_quality: string;
  expected_score_range: [number, number];
}

export interface Rubric {
  role: string;
  core_topics: string[];
  scoring_weights: {
    technical_accuracy: number;
    communication: number;
    confidence: number;
  };
  red_flags: string[];
  calibration_examples: CalibrationExample[];
  suggested_questions?: string[];
  /** Fraction of the interview dedicated to this rubric's questions (0–1). */
  weight_in_interview?: number;
}

interface ResumeContext {
  skills: unknown;
  experience: unknown;
  rawText: string;
}

// ── Cache rubric files in memory ───────────────────────────────────────────────
const rubricCache = new Map<string, Rubric>();

function loadAllRubrics(): Map<string, Rubric> {
  if (rubricCache.size > 0) return rubricCache;

  try {
    const files = fs.readdirSync(RUBRICS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(RUBRICS_DIR, file), "utf-8");
      const rubric = JSON.parse(raw) as Rubric;
      rubricCache.set(file.replace(".json", ""), rubric);
    }
  } catch {
    // Rubrics dir may not exist in test environments
  }

  return rubricCache;
}

/**
 * Two-stage fuzzy match:
 *   1. Alias lookup  — normalised input is checked for ALIASES substrings;
 *      longest (most specific) matching key wins. Confident hit: skip Jaccard.
 *   2. Stopword-filtered Jaccard — generic title words ("engineer", seniority
 *      levels, etc.) are stripped before computing token overlap so they can't
 *      cause spurious matches. Falls back to generic if score < 0.3.
 */
function fuzzyMatchRubric(jobRole: string): { rubricName: string; rubric: Rubric } {
  const rubrics = loadAllRubrics();
  // Use a broader normalisation for alias lookup: keep slashes so "ai/ml" works
  const normalizedForAlias = jobRole.toLowerCase().replace(/[^a-z0-9\s/]/g, "").trim();

  // ── Stage 1: Alias lookup ────────────────────────────────────────────────────
  let aliasMatch: string | null = null;
  let aliasKeyLen = 0;

  for (const [key, rubricName] of Object.entries(ALIASES)) {
    if (normalizedForAlias.includes(key) && key.length > aliasKeyLen) {
      aliasMatch = rubricName;
      aliasKeyLen = key.length;
    }
  }

  if (aliasMatch !== null && rubrics.has(aliasMatch)) {
    return { rubricName: aliasMatch, rubric: rubrics.get(aliasMatch)! };
  }

  // ── Stage 2: Stopword-filtered Jaccard ──────────────────────────────────────
  const normalizedRole = normalize(jobRole);
  let bestScore = 0;
  let bestName = "generic";

  for (const [name, rubric] of rubrics.entries()) {
    if (name === "generic" || name === "_common-behavioral") continue;
    const score = similarity(
      stripStopwords(normalizedRole),
      stripStopwords(normalize(rubric.role)),
    );
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  // Threshold: require at least 30% token overlap; otherwise use generic
  if (bestScore < 0.3 || !rubrics.has(bestName)) {
    const generic = rubrics.get("generic");
    if (!generic) throw new Error("Generic rubric not found — check src/rubrics/generic.json");
    return { rubricName: "generic", rubric: generic };
  }

  return { rubricName: bestName, rubric: rubrics.get(bestName)! };
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\/\-|]/g, " ")   // split separators into spaces before stripping
    .replace(/[^a-z0-9\s]/g, "") // strip remaining non-alphanumeric
    .replace(/\s+/g, " ")        // collapse any double-spaces
    .trim();
}

/** Remove stopwords from an already-normalised token string. */
function stripStopwords(normalised: string): string {
  return normalised
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .join(" ");
}

function similarity(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Service Interface ─────────────────────────────────────────────────────────

export const rubricService = {
  /**
   * Load the best-matching rubric for a given job role.
   */
  getRubric(jobRole: string): { rubric: Rubric; rubricName: string } {
    return fuzzyMatchRubric(jobRole);
  },

  /**
   * Load the common behavioral rubric directly by filename.
   * This is NOT role-matched — it applies to every interview session.
   */
  getCommonRubric(): Rubric {
    const rubrics = loadAllRubrics();
    const common = rubrics.get("_common-behavioral");
    if (!common) {
      throw new Error(
        "Common behavioral rubric not found — check src/rubrics/_common-behavioral.json"
      );
    }
    return common;
  },

  /**
   * Build the system prompt sent to Vapi for the live interview assistant.
   *
   * Injects: interviewer persona, turn discipline, rubric topics, resume summary, JD summary.
   */
  buildVapiSystemPrompt(
    rubric: Rubric,
    resumeContext: ResumeContext | null,
    jobDescription: string,
    commonRubric?: Rubric
  ): string {
    const topicsStr = rubric.core_topics.map((t) => `- ${t}`).join("\n");

    // ── Build labeled question banks ──────────────────────────────────────────
    const behavioralQs = commonRubric?.suggested_questions ?? [];
    const technicalQs = rubric.suggested_questions ?? [];

    const behavioralQsStr =
      behavioralQs.length > 0
        ? behavioralQs.map((q, i) => `  B${i + 1}. ${q}`).join("\n")
        : "  Generate 1–2 behavioural questions relevant to the role.";

    const technicalQsStr =
      technicalQs.length > 0
        ? technicalQs.map((q, i) => `  T${i + 1}. ${q}`).join("\n")
        : "  Generate 4–5 technical questions based on the rubric topics and candidate background.";

    const resumeSummary = resumeContext
      ? `The candidate has the following background (extracted from their CV):
Skills: ${JSON.stringify(resumeContext.skills)}
Experience: ${JSON.stringify(resumeContext.experience)}
Raw CV excerpt: ${resumeContext.rawText.slice(0, 1500)}`
      : "No CV was provided for this candidate.";

    const jdSummary = jobDescription.slice(0, 1500);

    return `You are an expert technical interviewer conducting a ${rubric.role} interview.

## Your Persona
- Professional, warm, and precise
- You ask ONE question at a time and wait for a complete answer before moving on
- You probe deeper when an answer is vague or incomplete ("Can you elaborate on that?", "Walk me through that decision")
- You do NOT give hints or answer the candidate's questions about your own questions
- Keep your responses under 50 words unless clarifying something complex
- You never announce the interview role or format to the candidate — that context is yours alone

## Interview Flow (follow this order strictly)

### Step 1 — Candidate Self-Introduction
The candidate has already been asked to introduce themselves. Listen actively to their self-introduction. Do NOT ask any technical questions yet.

### Step 2 — Brief Acknowledgment
After they finish, give a warm, brief acknowledgment (1–2 sentences max) that references something specific they mentioned. For example: "Great background in X — that'll be very relevant today." Then naturally transition to the question phase.

### Step 3 — Interleaved Behavioral + Technical Questions
Ask a total of 6–7 questions drawn from BOTH the Behavioral Questions and Technical Questions banks below.
- Ask 1–2 behavioral questions and 4–5 technical questions, interleaved naturally — do NOT ask all behavioral questions first, then all technical ones.
- A natural interleaving example: T1 → T2 → B1 → T3 → B2 → T4. Adapt to conversation flow.
- Start this phase AFTER the self-introduction is complete (Steps 1 & 2 must come first).

### Step 4 — Personalised Question
At least one of your questions (behavioral or technical) must be directly personalised — reference something the candidate mentioned during their self-introduction OR something specific from their CV (e.g. a project, a technology, or a past role). Do not ask a generic question when you have this context.

### Step 5 — Close Out
After 6–7 questions total, do not ask more. Conclude warmly.

## Interview Focus Areas (${rubric.role})
${topicsStr}

## Candidate Background
${resumeSummary}

## Job Description Summary
${jdSummary}

## Behavioral Questions (1–2 to use, interleaved with technical)
${behavioralQsStr}

## Technical Questions (4–5 to use, interleaved with behavioral)
${technicalQsStr}

## Red Flags to Watch For
${rubric.red_flags.map((f) => `- ${f}`).join("\n")}

## End of Interview
After covering all topics (6–7 questions total), conclude by saying: "That's all for today's interview. Thank you for your time — you'll receive your feedback report shortly."`;
  },

  /**
   * Build the prompt sent to Gemini Pro for post-call scoring.
   */
  buildScoringPrompt(
    rubric: Rubric,
    transcript: string,
    resumeContext: ResumeContext | null,
    jobDescription: string
  ): string {
    const weights = rubric.scoring_weights;
    const calibration = rubric.calibration_examples
      .map((c) => `- ${c.answer_quality} answer quality → score range ${c.expected_score_range[0]}-${c.expected_score_range[1]}`)
      .join("\n");

    return `You are an expert technical interview evaluator. Score the following interview transcript.

## Role Being Evaluated
${rubric.role}

## Scoring Weights
- Technical Accuracy: ${weights.technical_accuracy * 100}%
- Communication: ${weights.communication * 100}%
- Confidence: ${weights.confidence * 100}%

## Calibration Guide
${calibration}

## Red Flags (penalise heavily if observed)
${rubric.red_flags.map((f) => `- ${f}`).join("\n")}

## Core Topics Expected to Be Covered
${rubric.core_topics.map((t) => `- ${t}`).join("\n")}

## Candidate Background
${resumeContext ? `Skills: ${JSON.stringify(resumeContext.skills)}\nExperience: ${JSON.stringify(resumeContext.experience)}` : "Not provided"}

## Job Description
${jobDescription.slice(0, 1500)}

## Interview Transcript
---
${transcript}
---

## Instructions
Score each dimension from 0-100. Be strict and fair.
Return ONLY valid JSON matching this schema:
{
  "technicalAccuracy": <integer 0-100>,
  "communication": <integer 0-100>,
  "confidence": <integer 0-100>,
  "reasoning": {
    "technicalAccuracy": "<concise explanation with specific examples from the transcript>",
    "communication": "<concise explanation>",
    "confidence": "<concise explanation>"
  },
  "improvementTips": ["<specific, actionable tip>", ...]
}`;
  },
};
