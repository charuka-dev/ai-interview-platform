import { scoringJobHandler, type ScoringJobData } from "./scoringWorker.js";
import { BullMQQueue } from "./bullmqQueue.js";
import { InProcessQueue } from "./inProcessQueue.js";

/**
 * Queue abstraction layer.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ REDIS_URL set  → BullMQQueue  (production-grade, persistent)    │
 * │ REDIS_URL unset→ InProcessQueue (local dev, no Redis required)  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Both implement IQueue — swap without touching business logic.
 */

export interface IQueue {
  add(jobName: string, data: unknown): Promise<void>;
  close(): Promise<void>;
}

let queueInstance: IQueue | null = null;

export async function initQueue(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    console.info("[Queue] Redis URL found — using BullMQ (persistent queue)");
    queueInstance = new BullMQQueue(scoringJobHandler);
    await (queueInstance as BullMQQueue).start(redisUrl);
  } else {
    console.warn(
      "[Queue] REDIS_URL not set — falling back to in-process queue. " +
        "Jobs run async in the same Node process. Not suitable for production."
    );
    queueInstance = new InProcessQueue(scoringJobHandler);
  }
}

export function getQueue(): IQueue {
  if (!queueInstance) {
    throw new Error("Queue not initialised. Call initQueue() on server start.");
  }
  return queueInstance;
}

export type { ScoringJobData };
