
import { prisma } from "@/lib/server/prisma";

export type Source = {
  ref: number;
  documentId: string;
  documentName: string;
  text: string;
};

const STOP_WORDS = new Set([
  "the", "and", "are", "what", "which",
  "from", "about", "that", "this", "with",
  "have", "does", "for", "you", "your",
  "how", "can", "please", "explain", "tell",
  "me", "into", "was", "were", "where",
  "who", "why", "when", "is", "of", "in",
  "to", "a", "an", "on", "it",
]);

function tokenize(text: string): string[] {
  const words =
    text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  return words.filter(
    word => word.length >= 2 && !STOP_WORDS.has(word)
  );
}

export function splitIntoChunks(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();

  const chunks: string[] = [];
  const chunkSize = 1500;
  const overlap = 200;

  for (
    let start = 0;
    start < clean.length;
    start += chunkSize - overlap
  ) {
    chunks.push(clean.slice(start, start + chunkSize));
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
  // Search only documents belonging to this session.
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

  const questionWords = new Set(tokenize(question));

  type Candidate = Omit<Source, "ref"> & {
    score: number;
  };

  const candidates: Candidate[] = [];

  for (const document of documents) {
    const chunks = splitIntoChunks(
      document.extractedText
    );

    for (const chunk of chunks) {
      const chunkWords = new Set(tokenize(chunk));

      let score = 0;

      for (const word of questionWords) {
        if (chunkWords.has(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        candidates.push({
          documentId: document.id,
          documentName: document.name,
          text: chunk,
          score,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const sources: Source[] = candidates
    .slice(0, 4)
    .map(({ score: _score, ...source }, index) => ({
      ...source,
      ref: index + 1,
    }));

  return {
    documentCount: documents.length,
    sources,
  };
}
