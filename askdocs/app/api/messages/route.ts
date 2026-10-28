
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getConversationHistory,
  processQuestion,
} from "@/lib/server/services/message.service";


const COOKIE_NAME = "askdocs_session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

async function getConversationId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  return value && UUID_PATTERN.test(value)
    ? value
    : null;
}

export async function GET() {
  const conversationId = await getConversationId();

  if (!conversationId) {
    return NextResponse.json([]);
  }

  try {
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
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const text =
    typeof body === "object" &&
    body !== null &&
    "text" in body
      ? body.text
      : undefined;

  const existingId = await getConversationId();
  const conversationId =
    existingId ?? crypto.randomUUID();

  try {
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

    const response = NextResponse.json(
      result.message,
      { status: 201 }
    );

    response.cookies.set(
      COOKIE_NAME,
      conversationId,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  }  catch (error) {
    console.error("Question processing failed:", error);

    return NextResponse.json(
      {
        error:
          "Could not process the question. " +
          "Check the server logs, database and local AI.",
      },
      { status: 500 }
    );
  }
}
