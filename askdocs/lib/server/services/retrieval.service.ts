import { prisma } from '@/lib/server/prisma';
import { embedTexts, EMBEDDING_MODEL } from './embedding.service';
import {
  rankHybridPassages,
  type SemanticRow,
  type LexicalRow,
  type Source,
} from './rag-grounding';

// Preserve the Source import contract expected by ai.service.ts.
export type { Source } from './rag-grounding';

const CANDIDATE_LIMIT = 16;

/** Retrieve from READY documents owned by this conversation only. */
export async function findRelevantPassages(
  conversationId: string,
  question: string
): Promise<{
  documentCount: number;
  readyDocumentCount: number;
  sources: Source[];
}> {
  const [documentCount, readyDocumentCount] = await Promise.all([
    prisma.document.count({ where: { conversationId } }),
    prisma.document.count({ where: { conversationId, indexStatus: 'READY' } }),
  ]);

  if (!readyDocumentCount) {
    return { documentCount, readyDocumentCount, sources: [] };
  }

  // This embedding is compatible with existing 768-dimension pgvector chunks.
  const [queryVector] = await embedTexts([`search_query: ${question}`]);
  if (!queryVector) throw new Error('Ollama did not produce a query vector');
  const vector = `[${queryVector.join(',')}]`;

  // Semantic: approximate meaning, including paraphrases.
  const semantic = await prisma.$queryRaw<SemanticRow[]>`
    SELECT c."id" AS "chunkId", c."documentId", c."chunkIndex",
           d."name" AS "documentName", c."content" AS "text",
           (1 - (c."embedding" <=> ${vector}::vector))::double precision AS "similarity"
    FROM "DocumentChunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    WHERE d."conversationId" = ${conversationId}
      AND d."indexStatus" = 'READY'
      AND c."model" = ${EMBEDDING_MODEL}
    ORDER BY c."embedding" <=> ${vector}::vector
    LIMIT ${CANDIDATE_LIMIT}
  `;

  // Lexical: exact technical terms, IDs and quoted subject words.
  // Parameterized PostgreSQL full-text search: no user text is interpolated.
  const lexical = await prisma.$queryRaw<LexicalRow[]>`
    WITH q AS (SELECT websearch_to_tsquery('english', ${question}) AS tsquery)
    SELECT c."id" AS "chunkId", c."documentId", c."chunkIndex",
           d."name" AS "documentName", c."content" AS "text",
           ts_rank_cd(to_tsvector('english', c."content"), q.tsquery)::double precision AS "lexicalScore"
    FROM "DocumentChunk" c
    JOIN "Document" d ON d."id" = c."documentId"
    CROSS JOIN q
    WHERE d."conversationId" = ${conversationId}
      AND d."indexStatus" = 'READY'
      AND c."model" = ${EMBEDDING_MODEL}
      AND to_tsvector('english', c."content") @@ q.tsquery
    ORDER BY "lexicalScore" DESC
    LIMIT ${CANDIDATE_LIMIT}
  `;

  const sources = rankHybridPassages(semantic, lexical).map((row, i) => ({
    ref: i + 1,
    documentId: row.documentId,
    documentName: row.documentName,
    chunkIndex: row.chunkIndex,
    text: row.text,
  }));

  return { documentCount, readyDocumentCount, sources };
}
