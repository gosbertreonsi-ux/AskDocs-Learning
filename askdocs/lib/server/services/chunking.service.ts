
const CHUNK_SIZE = 1200;
const OVERLAP = 200;

export function splitIntoChunks(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) return [];

  const chunks: string[] = [];
  const step = CHUNK_SIZE - OVERLAP;

  for (let start = 0; start < clean.length; start += step) {
    chunks.push(clean.slice(start, start + CHUNK_SIZE));
  }

  return chunks;
}
