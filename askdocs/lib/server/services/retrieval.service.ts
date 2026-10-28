
import { prisma } from "@/lib/server/prisma";

import {
  embedTexts,
  EMBEDDING_MODEL,
} from "./embedding.service";

// Keep this interface unchanged.
// ai.service.ts and message.service.ts depend on it.
export type Source = {
  ref: number;
  documentId: string;
  documentName: string;
  text: string;
};

type SearchRow = {
  documentId: string;
  documentName: string;
  text: string;
  similarity: number;
};

// Experimental threshold, not a confidence score.
const MIN_SIMILARITY = 0.30;

export async function findRelevantPassages(
  conversationId: string,
  question: string
): Promise<{
  documentCount: number;
  sources: Source[];
}> {
  // 1. Check whether this conversation has documents.
  const documentCount = await prisma.document.count({
    where: { conversationId },
  });

  if (documentCount === 0) {
    return {
      documentCount: 0,
      sources: [],
    };
  }

  // 2. Generate an embedding ONLY for the question.
  const [queryVector] = await embedTexts([
    `search_query: ${question}`,
  ]);

  // Convert numbers into a pgvector-compatible string.
  const vectorLiteral = `[${queryVector.join(",")}]`;

  // 3. Search embeddings stored in PostgreSQL.
  // First restrict the search to this conversation.
  // Then rank those passages by cosine distance.
  const rows = await prisma.$queryRaw<SearchRow[]>`
    WITH scoped AS MATERIALIZED (
      SELECT
        c."documentId",
        d."name" AS "documentName",
        c."content" AS "text",
        c."embedding"
      FROM "DocumentChunk" c
      INNER JOIN "Document" d
        ON d."id" = c."documentId"
      WHERE
        d."conversationId" = ${conversationId}
        AND c."model" = ${EMBEDDING_MODEL}
    )
    SELECT
      "documentId",
      "documentName",
      "text",
      (
        1 - (
          "embedding" <=> ${vectorLiteral}::vector
        )
      )::double precision AS "similarity"
    FROM scoped
    ORDER BY
      "embedding" <=> ${vectorLiteral}::vector
    LIMIT 4
  `;

  // 4. Inspect rankings during development.
  console.log(
    "[PGVECTOR SEARCH]",
    rows.map(row => ({
      document: row.documentName,
      similarity: row.similarity.toFixed(3),
    }))
  );

  // 5. Return matching passages to the AI layer.
  const sources: Source[] = rows
    .filter(
      row => row.similarity >= MIN_SIMILARITY
    )
    .map((row, index) => ({
      ref: index + 1,
      documentId: row.documentId,
      documentName: row.documentName,
      text: row.text,
    }));

  return {
    documentCount,
    sources,
  };
}
