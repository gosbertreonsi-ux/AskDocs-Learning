/**
 * Lesson 15: deterministic RAG ranking, output validation and evidence display.
 * These pure functions are tested without a database or Ollama.
 */

export type Source = {
  ref: number;
  documentId: string;
  documentName: string;
  chunkIndex: number; // 0-based chunk number, NOT a PDF page number
  text: string;
};

export type PassageRow = {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
};

export type SemanticRow = PassageRow & { similarity: number };
export type LexicalRow = PassageRow & { lexicalScore: number };

const MIN_SIMILARITY = 0.30; // A tuning threshold, not a confidence value.
const RRF_CONSTANT = 60;
const MAX_SOURCES = 4;

type Scored = { passage: PassageRow; score: number };

/**
 * Reciprocal rank fusion (RRF) combines semantic and lexical rankings.
 * Only semantic hits above a modest floor or matching lexical hits enter.
 * This does NOT prove factual correctness: the answer still needs validation.
 */
export function rankHybridPassages(
  semantic: SemanticRow[],
  lexical: LexicalRow[]
): PassageRow[] {
  const candidates = new Map<string, Scored>();
  const add = (row: PassageRow, score: number) => {
    const old = candidates.get(row.chunkId);
    if (old) old.score += score;
    else candidates.set(row.chunkId, { passage: row, score });
  };

  semantic.forEach((row, index) => {
    if (Number.isFinite(row.similarity) && row.similarity >= MIN_SIMILARITY) {
      add(row, 2 / (RRF_CONSTANT + index + 1));
    }
  });
  lexical.forEach((row, index) => {
    if (Number.isFinite(row.lexicalScore) && row.lexicalScore > 0) {
      add(row, 1.5 / (RRF_CONSTANT + index + 1));
    }
  });

  const sorted = [...candidates.values()].sort((a, b) => {
    const diff = b.score - a.score;
    return diff || a.passage.chunkId.localeCompare(b.passage.chunkId);
  });

  // Limit immediate-neighbor duplicates from overlapping document chunks.
  const chosen: PassageRow[] = [];
  for (const { passage } of sorted) {
    if (chosen.some(other =>
      other.documentId === passage.documentId &&
      Math.abs(other.chunkIndex - passage.chunkIndex) <= 1
    )) continue;
    chosen.push(passage);
    if (chosen.length >= MAX_SOURCES) break;
  }
  return chosen;
}

export type GroundedModelReply = { answer: string; citations: number[] };

/** Reject unparseable, unsourced, or fabricated citation IDs. */
export function parseGroundedReply(
  raw: string,
  sources: readonly Source[]
): GroundedModelReply | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.answer !== 'string' || !Array.isArray(obj.citations)) return null;
  const answer = obj.answer.trim();
  if (answer.length < 3 || answer.length > 8000) return null;

  const ids = new Set(sources.map(s => s.ref));
  const citations: number[] = [];
  for (const id of obj.citations) {
    if (!Number.isInteger(id) || !ids.has(id as number)) return null;
    if (!citations.includes(id as number)) citations.push(id as number);
  }
  if (citations.length === 0) return null;

  // We generate citation lines ourselves. This prevents arbitrary markers
  // inside the model answer from masquerading as validated references.
  const cleanedAnswer = answer.replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, '').trim();
  if (cleanedAnswer.length < 3) return null;
  return { answer: cleanedAnswer, citations };
}

export const NOT_GROUNDED =
  "I couldn't verify an answer from the retrieved document passages. " +
  "Try a more specific question or check that your PDF has finished indexing.";

export function renderGroundedReply(
  reply: GroundedModelReply,
  sources: readonly Source[]
): string {
  const byRef = new Map(sources.map(source => [source.ref, source]));
  const lines = reply.citations.map(ref => {
    const source = byRef.get(ref);
    if (!source) throw new Error('Unvalidated citation reference');
    const cleanName = source.documentName.replace(/[\r\n\t]+/g, ' ').trim();
    const excerpt = source.text.replace(/\s+/g, ' ').trim();
    const preview = excerpt.length <= 180 ? excerpt : `${excerpt.slice(0, 180)}…`;
    const href = `/documents/${encodeURIComponent(source.documentId)}`;
    return `[${ref}] ${cleanName} (${href})\n  Passage ${source.chunkIndex + 1}: “${preview}”`;
  });
  return `${reply.answer}\n\nSources (document passages, not PDF page numbers):\n${lines.join('\n')}`;
}
