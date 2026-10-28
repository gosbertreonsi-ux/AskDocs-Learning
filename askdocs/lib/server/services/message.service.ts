
import type { Message } from "@/lib/types";

import {
  findMessages,
  saveExchange,
} from "@/lib/server/repositories/message.repository";

import {
  findRelevantPassages,
} from "@/lib/server/services/retrieval.service";

import {
  generateDocumentAnswer,
} from "@/lib/server/services/ai.service";

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
  if (typeof rawText !== "string") {
    return {
      ok: false,
      error: "Question must be a string",
    };
  }

  const question = rawText.trim();

  if (!question || question.length > 2000) {
    return {
      ok: false,
      error: "Question must be 1–2000 characters",
    };
  }

  // STEP 1: Retrieve relevant document passages.
  const { documentCount, sources } =
    await findRelevantPassages(
      conversationId,
      question
    );

  let answer: string;

  if (documentCount === 0) {
    answer =
      "Please upload a PDF document first. " +
      "You can do this on the My Documents page.";
  } else if (sources.length === 0) {
    answer =
      "I couldn't find a relevant passage in " +
      "your searched documents.";
  } else {
    // STEP 2: Generate the answer with local AI.
    const generated = await generateDocumentAnswer(
      question,
      sources
    );

    // STEP 3: Attach the retrieved sources.
    const references = sources
      .map(
        source =>
          `[${source.ref}] ${source.documentName} ` +
          `(/documents/${source.documentId})`
      )
      .join("\n");

    answer =
      `${generated}\n\nRetrieved sources:\n${references}`;
  }

  // STEP 4: Save the question and answer.
  const savedReply = await saveExchange(
    conversationId,
    question,
    answer
  );

  return {
    ok: true,
    message: savedReply,
  };
}
