import type { IQueue } from "./index.js";

type JobHandler = (jobName: string, data: unknown) => Promise<void>;

/**
 * In-process queue fallback — no Redis required.
 *
 * Jobs run asynchronously in the same Node.js event loop.
 * Failures are logged but do NOT crash the server.
 *
 * ⚠️  NOT suitable for production:
 * - Jobs are lost if the process restarts
 * - No retry logic
 * - No job visibility/monitoring
 *
 * Use for local development when Redis is unavailable.
 */
export class InProcessQueue implements IQueue {
  private readonly handler: JobHandler;

  constructor(handler: JobHandler) {
    this.handler = handler;
  }

  async add(jobName: string, data: unknown): Promise<void> {
    // Schedule the job on the next iteration of the event loop
    // so the caller (webhook handler) can respond before the job starts
    setImmediate(() => {
      this.handler(jobName, data).catch((err: Error) => {
        console.error(`[InProcessQueue] Job "${jobName}" failed:`, err.message);
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async close(): Promise<void> {
    // Nothing to close
  }
}
