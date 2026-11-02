import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import prisma from "../prisma/client.js";
import { authenticate } from "../middleware/auth.js";

const BCRYPT_COST = parseInt(process.env.BCRYPT_COST ?? "12", 10);

// ── JSON Schema Definitions ───────────────────────────────────────────────────

const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password", "name"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email", maxLength: 254 },
      password: { type: "string", minLength: 8, maxLength: 128 },
      name: { type: "string", minLength: 1, maxLength: 100 },
      roleTarget: { type: "string", maxLength: 100 },
    },
  },
} as const;

const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 },
    },
  },
} as const;

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/register
   */
  app.post("/register", { schema: registerSchema }, async (request, reply) => {
    const { email, password, name, roleTarget } = request.body as {
      email: string;
      password: string;
      name: string;
      roleTarget?: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Conflict", message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await prisma.user.create({
      data: { email, passwordHash, name, roleTarget },
      select: { id: true, email: true, name: true, roleTarget: true, createdAt: true },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.code(201).send({ user, token });
  });

  /**
   * POST /api/auth/login
   */
  app.post("/login", { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.code(200).send({
      user: { id: user.id, email: user.email, name: user.name, roleTarget: user.roleTarget },
      token,
    });
  });

  /**
   * GET /api/auth/me
   */
  app.get(
    "/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: request.user.sub },
        select: { id: true, email: true, name: true, roleTarget: true, createdAt: true },
      });
      return reply.send(user);
    }
  );
}
