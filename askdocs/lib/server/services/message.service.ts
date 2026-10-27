
import type { Message } from "@/lib/types";

import {
  findMessages,
  saveExchange,
} from "@/lib/server/repositories/message.repository";

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

  const text = rawText.trim();

  if (!text) {
    return {
      ok: false,
      error: "Question cannot be empty",
    };
  }

  if (text.length > 2000) {
    return {
      ok: false,
      error: "Question is too long",
    };
  }

  // AI is still simulated at this stage.
  const answer =
    `You asked: ${text}. ` +
    "Document search is not connected yet.";

  const savedReply = await saveExchange(
    conversationId,
    text,
    answer
  );

  return {
    ok: true,
    message: savedReply,
  };
}
