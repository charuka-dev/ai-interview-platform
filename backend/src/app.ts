import "dotenv/config";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCors from "@fastify/cors";

import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import { authRoutes } from "./routes/auth.routes.js";
import { resumeRoutes } from "./routes/resume.routes.js";
import { jobPostingRoutes } from "./routes/jobPosting.routes.js";
import { sessionRoutes } from "./routes/session.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";

export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      ...(process.env.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss Z" },
        },
      }),
    },
  });

  // ─── CORS ────────────────────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ─── JWT ─────────────────────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "change_me_in_production",
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  });

  // ─── Multipart (file uploads) ─────────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
  });

  // ─── Error Handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ─── Routes ───────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(resumeRoutes, { prefix: "/api/resumes" });
  await app.register(jobPostingRoutes, { prefix: "/api/job-postings" });
  await app.register(sessionRoutes, { prefix: "/api/sessions" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(webhookRoutes, { prefix: "/api/webhooks" });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  return app;
}
