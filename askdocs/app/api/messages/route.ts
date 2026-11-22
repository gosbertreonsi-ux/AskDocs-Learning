import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getUserConversationId,
  isSameOrigin,
} from '@/lib/server/auth';
import {
  getConversationHistory,
  processQuestion,
} from '@/lib/server/services/message.service';
import { readJsonWithinLimit } from '@/lib/server/security/read-json';
import { enforceRateLimits } from '@/lib/server/security/rate-limit';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const conversationId = await getUserConversationId(user.id);
    const messages = await getConversationHistory(conversationId);
    return NextResponse.json(messages, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Load messages failed:', error);
    return NextResponse.json({ error: 'Could not load messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const blocked = await enforceRateLimits([
    { bucket: 'ai:questions', identifier: user.id, max: 25, windowSeconds: 300 },
  ]);
  if (blocked) return blocked;

  const parsed = await readJsonWithinLimit(request, 12000);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.data as { text?: unknown } | null;
  try {
    const conversationId = await getUserConversationId(user.id);
    const result = await processQuestion(conversationId, body?.text);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.message, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Question processing failed:', error);
    return NextResponse.json(
      { error: 'Could not answer. Verify that Ollama is running and documents are indexed.' },
      { status: 503 }
    );
  }
}
