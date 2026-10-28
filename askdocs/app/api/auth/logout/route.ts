
import { NextResponse } from "next/server";

import {
  revokeCurrentSession,
  clearLoginCookie,
  isSameOrigin,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  try {
    await revokeCurrentSession();

    const response = NextResponse.json({
      success: true,
    });

    clearLoginCookie(response);
    return response;
  } catch (error) {
    console.error("Logout failed:", error);

    return NextResponse.json(
      { error: "Could not sign out" },
      { status: 500 }
    );
  }
}
