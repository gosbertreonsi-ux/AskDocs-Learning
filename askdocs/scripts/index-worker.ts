import "dotenv/config";
import { Worker } from "bullmq";

import { prisma } from "../lib/server/prisma";
import { indexDocument } from "../lib/server/services/indexing.service";
import {
  INDEX_QUEUE_NAME,
  type IndexJobData,
  redisConnection,
} from "../lib/server/queue/index";

const worker = new Worker<IndexJobData>(
  INDEX_QUEUE_NAME,
  async (job) => {
    const document = await prisma.document.findUnique({
      where: { id: job.data.documentId },
      select: { id: true, name: true, extractedText: true, indexStatus: true },
    });

    // A document may be deleted while its job is waiting.
    if (!document || document.indexStatus === "READY") return;

    await prisma.document.update({
      where: { id: document.id },
      data: { indexStatus: "PROCESSING", indexError: null },
    });

    try {
      const count = await indexDocument(document.id, document.extractedText);
      await prisma.document.update({
        where: { id: document.id },
        data: {
          indexStatus: "READY",
          indexError: null,
          indexedAt: new Date(),
        },
      });
      console.log(`[INDEX READY] ${document.name} (${count} chunks)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown indexing error";
      const attempts = job.opts.attempts ?? 1;
      const finalAttempt = job.attemptsMade + 1 >= attempts;
      await prisma.document.update({
        where: { id: document.id },
        data: {
          indexStatus: finalAttempt ? "FAILED" : "PENDING",
          indexError: message.slice(0, 500),
        },
      });
      throw error;
    }
  },
  {
    connection: redisConnection(true),
    concurrency: 1, // Safeguards a local, CPU-limited Ollama runtime.
  }
);

worker.on("ready", () => console.log("[ASKDOCS WORKER] Ready"));
worker.on("failed", (job, err) => {
  console.error(`[INDEX FAILED] ${job?.id ?? "unknown"}: ${err.message}`);
});
worker.on("error", (err) => console.error("[WORKER ERROR]", err));

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
