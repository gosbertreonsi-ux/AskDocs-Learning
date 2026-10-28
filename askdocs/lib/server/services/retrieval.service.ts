
import { prisma } from "@/lib/server/prisma";

import {
  embedTexts,
  cosineSimilarity,
} from "./embedding.service";

export type Source = {
  ref: number;
  documentId: string;
  documentName: string;
  text: string;
};

type Candidate = Omit<Source, "ref">;

type ScoredCandidate = Candidate & {
  similarity: number;
};

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

// Keep the first experiment small for local hardware.
const MAX_CHUNKS = 40;
const BATCH_SIZE = 8;

// Experimental threshold, not a confidence guarantee.
const MIN_SIMILARITY = 0.30;

export function splitIntoChunks(
  text: string
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) return [];

  const chunks: string[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (
    let start = 0;
    start < clean.length;
    start += step
  ) {
    chunks.push(
      clean.slice(start, start + CHUNK_SIZE)
    );
  }

  return chunks;
}

export async function findRelevantPassages(
  conversationId: string,
  question: string
): Promise<{
  documentCount: number;
  sources: Source[];
}> {
  // 1. Load documents from the current conversation.
  const documents = await prisma.document.findMany({
    where: { conversationId },
    select: {
      id: true,
      name: true,
      extractedText: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (documents.length === 0) {
    return {
      documentCount: 0,
      sources: [],
    };
  }

  // 2. Split extracted document text into chunks.
  const candidates: Candidate[] = [];

  for (const document of documents) {
    const chunks = splitIntoChunks(
      document.extractedText
    );

    for (const chunk of chunks) {
      candidates.push({
        documentId: document.id,
        documentName: document.name,
        text: chunk,
      });

      if (candidates.length >= MAX_CHUNKS) break;
    }

    if (candidates.length >= MAX_CHUNKS) break;
  }

  if (candidates.length === 0) {
    return {
      documentCount: documents.length,
      sources: [],
    };
  }

  // 3. Create an embedding for the user's question.
  const [queryVector] = await embedTexts([
    `search_query: ${question}`,
  ]);

  // 4. Embed document chunks in small batches.
  const scored: ScoredCandidate[] = [];

  for (
    let start = 0;
    start < candidates.length;
    start += BATCH_SIZE
  ) {
    const batch = candidates.slice(
      start,
      start + BATCH_SIZE
    );

    const vectors = await embedTexts(
      batch.map(
        item => `search_document: ${item.text}`
      )
    );

    for (let i = 0; i < batch.length; i++) {
      const similarity = cosineSimilarity(
        queryVector,
        vectors[i]
      );

      scored.push({
        ...batch[i],
        similarity,
      });
    }
  }

  // 5. Rank passages by semantic similarity.
  scored.sort(
    (a, b) => b.similarity - a.similarity
  );

  console.log(
    "[RETRIEVAL] Top similarity scores:",
    scored
      .slice(0, 4)
      .map(item => item.similarity.toFixed(3))
  );

  // 6. Select passages for the AI model.
  const sources: Source[] = scored
    .filter(
      item => item.similarity >= MIN_SIMILARITY
    )
    .slice(0, 4)
    .map(
      ({ similarity: _similarity, ...item }, index) => ({
        ref: index + 1,
        ...item,
      })
    );

  return {
    documentCount: documents.length,
    sources,
  };
}
