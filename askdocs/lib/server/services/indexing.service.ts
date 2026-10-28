
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/server/prisma";

import { splitIntoChunks } from "./chunking.service";
import {
  embedTexts,
  EMBEDDING_MODEL,
} from "./embedding.service";

const BATCH_SIZE = 8;
const MAX_CHUNKS = 60;

export async function indexDocument(
  documentId: string,
  extractedText: string
): Promise<number> {
  const chunks = splitIntoChunks(extractedText);

  if (chunks.length === 0) {
    throw new Error("Document has no searchable text");
  }

  if (chunks.length > MAX_CHUNKS) {
    throw new Error(
      "Document exceeds the demo indexing limit"
    );
  }

  const vectors: number[][] = [];

  // Generate embeddings in batches.
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const embeddings = await embedTexts(
      batch.map(text => `search_document: ${text}`)
    );

    vectors.push(...embeddings);
  }

  // Save the vectors in one database transaction.
  await prisma.$transaction(
    async tx => {
      for (let i = 0; i < chunks.length; i++) {
        const vector = `[${vectors[i].join(",")}]`;

        await tx.$executeRaw`
          INSERT INTO "DocumentChunk" (
            "id",
            "documentId",
            "chunkIndex",
            "content",
            "model",
            "embedding"
          )
          VALUES (
            ${randomUUID()},
            ${documentId},
            ${i},
            ${chunks[i]},
            ${EMBEDDING_MODEL},
            ${vector}::vector
          )
          ON CONFLICT ("documentId", "chunkIndex")
          DO UPDATE SET
            "content" = EXCLUDED."content",
            "model" = EXCLUDED."model",
            "embedding" = EXCLUDED."embedding"
        `;
      }

      // Clean up trailing chunks if reindexing
      // creates fewer chunks than previously stored.
      await tx.$executeRaw`
        DELETE FROM "DocumentChunk"
        WHERE "documentId" = ${documentId}
          AND "chunkIndex" >= ${chunks.length}
      `;
    },
    { maxWait: 10000, timeout: 60000 }
  );

  return chunks.length;
}
