import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { geminiService, type ParsedResume } from "./geminiService.js";

/**
 * ResumeParserService
 *
 * Implements the IResumeParser interface. Swap this implementation
 * by replacing this file — no other code changes required.
 *
 * Pipeline:
 *   1. extractText  → raw text from PDF or DOCX binary
 *   2. parseStructured → Gemini Flash call to produce structured JSON
 */

export interface IResumeParser {
  extractText(buffer: Buffer, mimeType: string): Promise<string>;
  parseStructured(rawText: string): Promise<ParsedResume>;
}

const resumeParserService: IResumeParser = {
  /**
   * Extract plain text from a PDF or DOCX buffer.
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === "application/pdf") {
      const result = await pdfParse(buffer);
      return result.text.trim();
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }

    throw new Error(`Unsupported MIME type for resume parsing: ${mimeType}`);
  },

  /**
   * Use Gemini Flash to extract structured skills and experience from raw text.
   */
  async parseStructured(rawText: string): Promise<ParsedResume> {
    if (!rawText || rawText.length < 50) {
      // Return empty structure for very short/unreadable files
      return {
        skills: { technical: [], soft: [], tools: [] },
        experience: [],
        summary: "Could not extract meaningful content from the provided file.",
      };
    }
    return geminiService.parseResume(rawText);
  },
};

export { resumeParserService };
