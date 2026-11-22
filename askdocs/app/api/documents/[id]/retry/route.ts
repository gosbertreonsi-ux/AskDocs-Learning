import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import {
  getAuthenticatedUser,
  getUserConversationId,
  isSameOrigin,
} from "@/lib/server/auth";
import { enqueueDocumentIndex, getIndexQueue } from "@/lib/server/queue/index";
import { enforceRateLimits } from '@/lib/server/security/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const blocked = await enforceRateLimits([
    { bucket: 'pdf:retry', identifier: user.id, max: 10, windowSeconds: 600 },
  ]);
  if (blocked) return blocked;

  const { id } = await params;
  const conversationId = await getUserConversationId(user.id);
  const document = await prisma.document.findFirst({
    where: { id, conversationId },
    select: { id: true, indexStatus: true },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (document.indexStatus !== "FAILED") {
    return NextResponse.json(
      { error: "Only failed indexing jobs can be retried" },
      { status: 409 }
    );
  }

  try {
    const queue = getIndexQueue();
    const previous = await queue.getJob(document.id);
    let state: string | undefined;
    if (previous) {
      state = await previous.getState();
      if (state !== "failed" && state !== "completed") {
        return NextResponse.json(
          { error: "Document already has an active indexing job" },
          { status: 409 }
        );
      }
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { indexStatus: "PENDING", indexError: null },
    });

    if (previous && state === "failed") {
      await previous.retry();
    } else {
      if (previous) await previous.remove();
      await enqueueDocumentIndex(document.id);
    }
    return NextResponse.json({ indexStatus: "PENDING" });
  } catch (error) {
    console.error("Index retry failed:", error);
    await prisma.document.update({
      where: { id: document.id },
      data: {
        indexStatus: "FAILED",
        indexError: "Index queue unavailable. Retry when Redis is running.",
      },
    }).catch(() => undefined);
    return NextResponse.json({ error: "Could not retry indexing" }, { status: 503 });
  }
}
