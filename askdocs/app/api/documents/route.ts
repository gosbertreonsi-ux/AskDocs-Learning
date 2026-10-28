
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { extractPdfText }
  from "@/lib/server/services/document.service";

import {
  saveDocument,
  listDocuments,
} from "@/lib/server/repositories/document.repository";

import { indexDocument }
  from "@/lib/server/services/indexing.service";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const COOKIE_NAME = "askdocs_session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

// Get the conversation identifier from the cookie.
async function getConversationId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  return value && UUID_PATTERN.test(value)
    ? value
    : null;
}

// GET: List previously uploaded documents.
export async function GET() {
  const conversationId = await getConversationId();

  if (!conversationId) {
    return NextResponse.json([]);
  }

  try {
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

// POST: Upload, extract, save and index a PDF.
export async function POST(request: Request) {
  let form: FormData;

  // STEP 1: Read the uploaded file.
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request" },
      { status: 400 }
    );
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Please select a PDF file" },
      { status: 400 }
    );
  }

  // STEP 2: Validate the PDF.
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  ) {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 415 }
    );
  }

  if (
    file.size === 0 ||
    file.size > MAX_FILE_SIZE
  ) {
    return NextResponse.json(
      { error: "PDF must be between 1 byte and 5 MB" },
      { status: 413 }
    );
  }

  // STEP 3: Extract the text.
  let text: string;

  try {
    text = await extractPdfText(file);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF extraction failed",
      },
      { status: 422 }
    );
  }

  // STEP 4: Save and index the document.
  try {
    const existingId = await getConversationId();

    const conversationId =
      existingId ?? crypto.randomUUID();

    // Save the document in PostgreSQL.
    const document = await saveDocument({
      conversationId,
      name: file.name.slice(0, 180),
      size: file.size,
      extractedText: text,
    });

    // STEP 5: Generate and store vector embeddings.
    let indexed = false;

    try {
      const chunkCount = await indexDocument(
        document.id,
        text
      );

      indexed = true;

      console.log(
        `[INDEXING SUCCESS] ${document.name}: ${chunkCount} chunks`
      );
    } catch (error) {
      console.error(
        "[INDEXING FAILED] Document saved, but indexing failed:",
        error
      );
    }

    // STEP 6: Return the saved document and status.
    const response = NextResponse.json(
      {
        ...document,
        indexed,
      },
      { status: 201 }
    );

    response.cookies.set(
      COOKIE_NAME,
      conversationId,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error("Document save failed:", error);

    return NextResponse.json(
      { error: "Could not save document" },
      { status: 500 }
    );
  }
}
