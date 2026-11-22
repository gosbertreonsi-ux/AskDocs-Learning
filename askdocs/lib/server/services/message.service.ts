import type { Message } from '@/lib/types';
import { findMessages, saveExchange } from '@/lib/server/repositories/message.repository';
import { findRelevantPassages } from './retrieval.service';
import { generateDocumentAnswer } from './ai.service';

type ReplyResult =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export async function getConversationHistory(
  conversationId: string
): Promise<Message[]> {
  return findMessages(conversationId);
}

export async function processQuestion(
  conversationId: string,
  rawText: unknown
): Promise<ReplyResult> {
  if (typeof rawText !== 'string') {
    return { ok: false, error: 'Question must be a string' };
  }
  const question = rawText.trim();
  if (!question || question.length > 2000) {
    return { ok: false, error: 'Question must be 1–2000 characters' };
  }

  const { documentCount, readyDocumentCount, sources } =
    await findRelevantPassages(conversationId, question);

  let answer: string;
  if (documentCount === 0) {
    answer = 'Please upload a PDF document first on the My Documents page.';
  } else if (readyDocumentCount === 0) {
    answer = 'Your documents are not searchable yet. Wait for indexing to finish or retry failed documents.';
  } else if (sources.length === 0) {
    answer = "I couldn't find relevant passages in your indexed documents. Try a more specific question.";
  } else {
    // The AI module validates source IDs and only displays approved document links.
    answer = await generateDocumentAnswer(question, sources);
  }

  const savedReply = await saveExchange(conversationId, question, answer);
  return { ok: true, message: savedReply };
}
