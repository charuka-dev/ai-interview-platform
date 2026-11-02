import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode ?? 500;

  // Don't leak stack traces or internal details in production
  const isDev = process.env.NODE_ENV !== "production";

  reply.code(statusCode).send({
    error: error.name ?? "InternalServerError",
    message: error.message,
    ...(isDev && { stack: error.stack }),
    ...(error.validation && { validation: error.validation }),
  });
}
