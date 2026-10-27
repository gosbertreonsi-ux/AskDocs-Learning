
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { findDocument }
  from "@/lib/server/repositories/document.repository";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sessionId =
    (await cookies()).get("askdocs_session")?.value;

  if (!sessionId) {
    notFound();
  }

  const document = await findDocument(
    id,
    sessionId
  );

  if (!document) {
    notFound();
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/documents">
        Back to documents
      </Link>

      <h1>{document.name}</h1>

      <p>
        File size: {(document.size / 1024).toFixed(1)} KB
      </p>

      <h2>Extracted Text</h2>

      <article
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          lineHeight: 1.7,
        }}
      >
        {document.extractedText}
      </article>
    </main>
  );
}
