
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/server/prisma";
import {
  createLoginSession,
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
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  if (
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      { error: "Use 12 or more characters, up to 72 UTF-8 bytes" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const token = await createLoginSession(user.id);

    const response = NextResponse.json(
      { user },
      { status: 201 }
    );

    setLoginCookie(response, token);
    return response;
  } catch (error) {
    console.error("Registration failed:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
