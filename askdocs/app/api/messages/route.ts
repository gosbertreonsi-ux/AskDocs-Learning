
import { NextResponse } from "next/server";
import type { Message } from "@/lib/types";

export async function GET() {
  const welcome: Message = {
    id: 1,
    role: "ai",
    text: "Hello from the AskDocs server!",
  };

  return NextResponse.json([welcome]);
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
    "text" in body &&
    typeof body.text === "string"
      ? body.text.trim()
      : "";

  if (!text) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 }
    );
  }

  // Simulated answer from the server.
  // Real document retrieval and AI come later.
  const reply: Message = {
    id: Date.now(),
    role: "ai",
    text: `You asked: ${text}. Document search is not connected yet.`,
  };

  return NextResponse.json(reply);
}
