
import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  getUserConversationId,
  isSameOrigin,
} from "@/lib/server/auth";

import {
  getConversationHistory,
  processQuestion,
} from "@/lib/server/services/message.service";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const conversationId =
      await getUserConversationId(user.id);

    const messages =
      await getConversationHistory(conversationId);

    return NextResponse.json(messages, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Load messages failed:", error);

    return NextResponse.json(
      { error: "Could not load messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = body?.text;

  try {
    const conversationId =
      await getUserConversationId(user.id);

    const result = await processQuestion(
      conversationId,
      text
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      result.message,
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch (error) {
    console.error("Question processing failed:", error);

    return NextResponse.json(
      { error: "Could not process the question" },
      { status: 500 }
    );
  }
}
