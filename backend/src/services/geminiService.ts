import { GoogleGenAI, Type } from "@google/genai";

/**
 * Gemini service — strictly separates the two model usages:
 *
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ gemini-2.0-flash    │ Resume/JD parsing (low latency, extraction only) │
 * │ gemini-2.5-pro      │ Post-call scoring (called once, max reasoning)    │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * NOTE: Live interview conversation is handled by Vapi + Gemini Flash directly
 * (configured in vapiService). This service only handles server-side LLM calls.
 *
 * API keys NEVER leave the server.
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL ?? "gemini-2.0-flash";
const PRO_MODEL = process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoringResult {
  technicalAccuracy: number; // 0-100
  communication: number; // 0-100
  confidence: number; // 0-100
  reasoning: {
    technicalAccuracy: string;
    communication: string;
    confidence: string;
  };
  improvementTips: string[];
}

export interface ParsedResume {
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  experience: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  summary: string;
}

export interface RoadmapSynthesis {
  focusAreas: {
    area: string;
    priority: "high" | "medium" | "low";
    description: string;
  }[];
  resources: {
    title: string;
    type: "course" | "book" | "article" | "practice";
    url?: string;
  }[];
}

// ── Scoring response schema (JSON mode) ──────────────────────────────────────

const scoringSchema = {
  type: Type.OBJECT,
  properties: {
    technicalAccuracy: {
      type: Type.INTEGER,
      description: "Technical accuracy score 0-100",
    },
    communication: {
      type: Type.INTEGER,
      description: "Communication score 0-100",
    },
    confidence: {
      type: Type.INTEGER,
      description: "Confidence score 0-100",
    },
    reasoning: {
      type: Type.OBJECT,
      properties: {
        technicalAccuracy: { type: Type.STRING },
        communication: { type: Type.STRING },
        confidence: { type: Type.STRING },
      },
      required: ["technicalAccuracy", "communication", "confidence"],
    },
    improvementTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "technicalAccuracy",
    "communication",
    "confidence",
    "reasoning",
    "improvementTips",
  ],
};

// ── Scoring (Gemini Pro) ──────────────────────────────────────────────────────

export const geminiService = {
  /**
   * Score an interview transcript using Gemini Pro.
   * Called once per session after the call ends — never inline in the webhook.
   */
  async scoreInterview(prompt: string): Promise<ScoringResult> {
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: scoringSchema,
        temperature: 0.2, // Low temperature for consistent, structured scoring
      },
    });

    const text = response.text ?? "";
    return JSON.parse(text) as ScoringResult;
  },

  /**
   * Parse a resume's raw text into structured JSON.
   * Uses Flash model (low latency, sufficient for extraction).
   */
  async parseResume(rawText: string): Promise<ParsedResume> {
    const prompt = `You are a resume parser. Extract structured information from the following resume text.
Return a JSON object with these exact fields:
- skills: { technical: string[], soft: string[], tools: string[] }
- experience: [{ title, company, duration, highlights: string[] }]
- summary: string (2-3 sentence professional summary)

Resume text:
---
${rawText.slice(0, 8000)}
---
Return only valid JSON, no markdown.`;

    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = response.text ?? "";
    return JSON.parse(text) as ParsedResume;
  },

  /**
   * Synthesize an improvement roadmap from a set of recent scores.
   * Uses Pro model for reasoning quality.
   */
  async synthesizeRoadmap(
    scoreSummaries: string,
    jobRoles: string[]
  ): Promise<RoadmapSynthesis> {
    const prompt = `You are a career coach. Based on the following interview score history for a candidate
targeting roles in [${jobRoles.join(", ")}], generate a personalized improvement roadmap.

Score history:
${scoreSummaries}

Return a JSON object with:
- focusAreas: [{ area: string, priority: "high"|"medium"|"low", description: string }]
- resources: [{ title: string, type: "course"|"book"|"article"|"practice", url?: string }]

Focus on the weakest areas. Be specific and actionable. Max 5 focus areas, 6 resources.`;

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const text = response.text ?? "";
    return JSON.parse(text) as RoadmapSynthesis;
  },
};
