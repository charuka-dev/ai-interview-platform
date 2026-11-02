import { Queue, Worker, type Job } from "bullmq";
import type { IQueue } from "./index.js";

type JobHandler = (jobName: string, data: unknown) => Promise<void>;

/**
 * BullMQ-backed queue implementation.
 *
 * - Jobs are persisted in Redis and survive restarts
 * - Worker runs in the same process (suitable for single-instance deployments)
 * - For multi-instance, run workers as a separate process importing scoringWorker.ts
 */
export class BullMQQueue implements IQueue {
  private queue!: Queue;
  private worker!: Worker;
  private readonly handler: JobHandler;

  constructor(handler: JobHandler) {
    this.handler = handler;
  }

  async start(redisUrl: string): Promise<void> {
    const connection = { url: redisUrl };

    this.queue = new Queue("interview-jobs", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,  // Keep last 100 completed jobs
        removeOnFail: 50,       // Keep last 50 failed jobs
      },
    });

    this.worker = new Worker(
      "interview-jobs",
      async (job: Job) => {
        await this.handler(job.name, job.data);
      },
      {
        connection,
        concurrency: 5,
      }
    );

    this.worker.on("failed", (job, err) => {
      console.error(`[BullMQ] Job ${job?.id} failed after retries:`, err.message);
    });

    this.worker.on("completed", (job) => {
      console.info(`[BullMQ] Job ${job.id} (${job.name}) completed`);
    });
  }

  async add(jobName: string, data: unknown): Promise<void> {
    await this.queue.add(jobName, data);
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
