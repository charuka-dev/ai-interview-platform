import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Authentication middleware.
 *
 * Designed as a thin adapter layer — swapping to Clerk or Auth0
 * only requires changing this file, not any business logic.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized", message: "Invalid or missing token" });
  }
}

/**
 * Type augmentation so TypeScript knows about the JWT payload
 * on every request after authentication.
 */
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}
