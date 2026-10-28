
import { NextResponse } from "next/server";

import {
  getAuthenticatedUser,
  getUserConversationId,
  isSameOrigin,
} from "@/lib/server/auth";

import {
  extractPdfText,
} from "@/lib/server/services/document.service";

import {
  saveDocument,
  listDocuments,
} from "@/lib/server/repositories/document.repository";

import {
  indexDocument,
} from "@/lib/server/services/indexing.service";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const conversationId =
      await getUserConversationId(user.id);

    const documents = await listDocuments(
      conversationId
    );

    return NextResponse.json(documents, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Document listing failed:", error);

    return NextResponse.json(
      { error: "Could not load documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Please select a PDF" },
      { status: 400 }
    );
  }

  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  ) {
    return NextResponse.json(
      { error: "Only PDFs are supported" },
      { status: 415 }
    );
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "PDF must be between 1 byte and 5 MB" },
      { status: 413 }
    );
  }

  let extractedText: string;

  try {
    extractedText = await extractPdfText(file);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "PDF extraction failed",
      },
      { status: 422 }
    );
  }

  try {
    const conversationId =
      await getUserConversationId(user.id);

    const document = await saveDocument({
      conversationId,
      name: file.name.slice(0, 180),
      size: file.size,
      extractedText,
    });

    let indexed = false;

    try {
      const chunkCount = await indexDocument(
        document.id,
        extractedText
      );

      indexed = true;

      console.log(
        `[INDEXING] ${document.name}: ${chunkCount} chunks`
      );
    } catch (error) {
      console.error("Document indexing failed:", error);
    }

    return NextResponse.json(
      { ...document, indexed },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Document save failed:", error);

    return NextResponse.json(
      { error: "Could not save document" },
      { status: 500 }
    );
  }
}
