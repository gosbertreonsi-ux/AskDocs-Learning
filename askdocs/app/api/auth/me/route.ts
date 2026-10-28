
import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/server/auth";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } }
  );
}
