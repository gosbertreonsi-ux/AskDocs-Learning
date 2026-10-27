
import { NextResponse } from "next/server";

import {
  getWelcomeMessages,
  createDemoReply,
} from "@/lib/server/services/message.service";

// GET /api/messages
export async function GET() {
  const messages = getWelcomeMessages();

  return NextResponse.json(messages);
}

// POST /api/messages
export async function POST(request: Request) {
  let body: unknown;

  // Step 1: Read the incoming JSON.
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Step 2: Extract the incoming question.
  const text =
    typeof body === "object" &&
    body !== null &&
    "text" in body
      ? body.text
      : undefined;

  // Step 3: Delegate processing to the service.
  const result = createDemoReply(text);

  // Step 4: Convert service errors to HTTP errors.
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  // Step 5: Return a successful response.
  return NextResponse.json(result.message);
}
