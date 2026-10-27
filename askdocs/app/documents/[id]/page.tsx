
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { findDocument }
  from "@/lib/server/repositories/document.repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

// This component loads request-specific data.
async function DocumentContent({ params }: PageProps) {
  const { id } = await params;

  // Read the current user's anonymous session.
  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get("askdocs_session")?.value;

  if (!sessionId) {
    notFound();
  }

  // Query PostgreSQL using Prisma.
  const document = await findDocument(
    id,
    sessionId
  );

  if (!document) {
    notFound();
  }

  return (
    <article>
      <h1>{document.name}</h1>

      <p>
        File size: {(document.size / 1024).toFixed(1)} KB
      </p>

      <h2>Extracted Text</h2>

      <div
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          lineHeight: 1.7,
          marginTop: 16,
        }}
      >
        {document.extractedText}
      </div>
    </article>
  );
}

// This page can immediately display its shell.
export default function DocumentPage({
  params,
}: PageProps) {
  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/documents">
        Back to documents
      </Link>

      <Suspense fallback={<p>Loading document...</p>}>
        <DocumentContent params={params} />
      </Suspense>
    </main>
  );
}
