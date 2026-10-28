
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/server/prisma";
import {
  createLoginSession,
  revokeCurrentSession,
  setLoginCookie,
  isSameOrigin,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body?.password === "string"
      ? body.password
      : "";

  if (
    !email ||
    email.length > 254 ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    const valid =
      user !== null &&
      await bcrypt.compare(password, user.passwordHash);

    if (!user || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Invalidate a previous session from this browser.
    await revokeCurrentSession();

    const token = await createLoginSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });

    setLoginCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { error: "Could not sign in" },
      { status: 500 }
    );
  }
}
