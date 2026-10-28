
const OLLAMA_URL =
  "http://127.0.0.1:11434/api/embed";

export const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export async function embedTexts(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      truncate: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding request failed: HTTP ${response.status}`
    );
  }

  const data = (await response.json()) as {
    embeddings?: number[][];
  };

  const vectors = data.embeddings;

  if (
    !Array.isArray(vectors) ||
    vectors.length !== texts.length
  ) {
    throw new Error("Invalid embedding response");
  }

  for (const vector of vectors) {
    if (
      !Array.isArray(vector) ||
      vector.length !== 768 ||
      !vector.every(Number.isFinite)
    ) {
      throw new Error("Invalid embedding dimensions");
    }
  }

  return vectors;
}

export function cosineSimilarity(
  a: number[],
  b: number[]
): number {
  if (a.length !== b.length) {
    throw new Error("Vector dimensions do not match");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / Math.sqrt(normA * normB);
}
