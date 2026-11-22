import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import {
  createLoginSession,
  revokeCurrentSession,
  setLoginCookie,
  isSameOrigin,
} from '@/lib/server/auth';
import { readJsonWithinLimit } from '@/lib/server/security/read-json';
import {
  enforceRateLimits,
  optionalSourceRule,
} from '@/lib/server/security/rate-limit';
import { normalizeEmail } from '@/lib/server/security/security-core';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const parsed = await readJsonWithinLimit(request, 8192);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.data as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';

  // Rate-limit even attempts with invalid credentials to slow password guessing.
  const blocked = await enforceRateLimits([
    { bucket: 'auth:login:account', identifier: email || '(missing-email)', max: 8, windowSeconds: 900 },
    ...optionalSourceRule(request, 'auth:login:source', 35, 900),
  ]);
  if (blocked) return blocked;

  if (!email || email.length > 254 || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
    const valid = user !== null && await bcrypt.compare(password, user.passwordHash);
    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await revokeCurrentSession();
    const token = await createLoginSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    setLoginCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Could not sign in' }, { status: 500 });
  }
}
