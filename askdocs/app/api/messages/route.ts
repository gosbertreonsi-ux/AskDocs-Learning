import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { id: 1, role: "ai", text: "Hello from the server!" },
  ]);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  return NextResponse.json(
    { id: Date.now(), role: "user", text: body.text },
    { status: 201 }
  );
}