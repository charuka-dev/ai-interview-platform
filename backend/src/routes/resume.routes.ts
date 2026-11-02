import type { FastifyInstance } from "fastify";
import prisma from "../prisma/client.js";
import { authenticate } from "../middleware/auth.js";
import { resumeParserService } from "../services/resumeParserService.js";
import { storageService } from "../services/storageService.js";

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_RESUMES_MAX ?? "5", 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_RESUMES_WINDOW_MS ?? "3600000", 10);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function resumeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/resumes
   * Accepts multipart/form-data with a single file field named "resume".
   */
  app.post(
    "/",
    {
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: RATE_LIMIT_MAX,
          timeWindow: RATE_LIMIT_WINDOW,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;

      // Read the uploaded file
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "BadRequest", message: "No file uploaded" });
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        return reply
          .code(415)
          .send({ error: "UnsupportedMediaType", message: "Only PDF and DOCX files are accepted" });
      }

      const buffer = await data.toBuffer();
      const fileKey = `resumes/${userId}/${Date.now()}-${data.filename}`;

      // Upload to S3-compatible storage
      await storageService.upload(fileKey, buffer, data.mimetype);

      // Extract text + parse structure
      const rawText = await resumeParserService.extractText(buffer, data.mimetype);
      const parsed = await resumeParserService.parseStructured(rawText);

      const resume = await prisma.resume.create({
        data: {
          userId,
          fileKey,
          originalFilename: data.filename,
          mimeType: data.mimetype,
          parsedRawText: rawText,
          parsedSkills: parsed.skills as object,
          parsedExperience: parsed.experience as object,
        },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          parsedSkills: true,
          parsedExperience: true,
          uploadedAt: true,
        },
      });

      return reply.code(201).send(resume);
    }
  );

  /**
   * GET /api/resumes/:id
   * Returns resume metadata + a short-lived signed URL to the file.
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

      const resume = await prisma.resume.findFirst({
        where: { id, userId },
        select: {
          id: true,
          fileKey: true,
          originalFilename: true,
          mimeType: true,
          parsedSkills: true,
          parsedExperience: true,
          uploadedAt: true,
        },
      });

      if (!resume) {
        return reply.code(404).send({ error: "NotFound", message: "Resume not found" });
      }

      const signedUrl = await storageService.getSignedUrl(
        resume.fileKey,
        parseInt(process.env.S3_SIGNED_URL_EXPIRES ?? "3600", 10)
      );

      // Never return the raw bucket key/URL
      const { fileKey: _omit, ...safeResume } = resume;
      return reply.send({ ...safeResume, downloadUrl: signedUrl });
    }
  );
}
