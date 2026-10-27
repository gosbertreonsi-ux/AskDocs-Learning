
import type { Message } from "@/lib/types";

// The result can either succeed or fail.
type ReplyResult =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export function getWelcomeMessages(): Message[] {
  return [
    {
      id: 1,
      role: "ai",
      text: "Hello from the AskDocs server!",
    },
  ];
}

export function createDemoReply(
  rawText: unknown
): ReplyResult {

  // Business rule 1: The question must be text.
  if (typeof rawText !== "string") {
    return {
      ok: false,
      error: "Question must be a string",
    };
  }

  const text = rawText.trim();

  // Business rule 2: Empty questions are rejected.
  if (!text) {
    return {
      ok: false,
      error: "Question cannot be empty",
    };
  }

  // Business rule 3: Limit question length.
  if (text.length > 2000) {
    return {
      ok: false,
      error: "Question is too long",
    };
  }

  // Simulated answer, not yet a real AI response.
  const reply: Message = {
    id: Date.now(),
    role: "ai",
    text:
      `You asked: ${text}. ` +
      "Document search is not connected yet.",
  };

  return {
    ok: true,
    message: reply,
  };
}
