
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { prisma } from "@/lib/server/prisma";

export const AUTH_COOKIE = "askdocs_auth";
const SESSION_AGE = 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  id: string;
  email: string;
};

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// Create a secure random session token.
// Store its HASH, not the actual browser token.
export async function createLoginSession(
  userId: string
): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await prisma.authSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(
        Date.now() + SESSION_AGE * 1000
      ),
    },
  });

  return token;
}

export function setLoginCookie(
  response: NextResponse,
  token: string
) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_AGE,
  });
}

export function clearLoginCookie(
  response: NextResponse
) {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthenticatedUser():
  Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token || token.length > 200) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function revokeCurrentSession() {
  const token =
    (await cookies()).get(AUTH_COOKIE)?.value;

  if (!token) return;

  await prisma.authSession.deleteMany({
    where: {
      tokenHash: hashToken(token),
    },
  });
}

// Resolve the user's own primary conversation.
// Never accept its ID directly from the browser.
export async function getUserConversationId(
  userId: string
): Promise<string> {
  const conversation = await prisma.conversation.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });

  return conversation.id;
}

// Require a matching browser Origin for state-changing
// requests. Set APP_ORIGIN in production when needed.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  const expected =
    process.env.APP_ORIGIN?.replace(/\/$/, "") ??
    new URL(request.url).origin;

  return origin === expected;
}
