import { Queue } from "bullmq";

export const INDEX_QUEUE_NAME = "askdocs-document-index";
export type IndexJobData = { documentId: string };

function redisTarget() {
  const url = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6381");
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must be redis:// or rediss://");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

export function redisConnection(forWorker: boolean) {
  return {
    ...redisTarget(),
    // A web request must fail quickly if Redis is unavailable.
    // A standalone worker may reconnect until Redis returns.
    maxRetriesPerRequest: forWorker ? null : 1,
    enableOfflineQueue: forWorker,
  };
}

const shared = globalThis as typeof globalThis & {
  askdocsIndexQueue?: Queue<IndexJobData>;
};

export function getIndexQueue(): Queue<IndexJobData> {
  if (!shared.askdocsIndexQueue) {
    shared.askdocsIndexQueue = new Queue<IndexJobData>(INDEX_QUEUE_NAME, {
      connection: redisConnection(false),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return shared.askdocsIndexQueue;
}

export async function enqueueDocumentIndex(documentId: string) {
  return getIndexQueue().add(
    "index-document",
    { documentId },
    { jobId: documentId }
  );
}
