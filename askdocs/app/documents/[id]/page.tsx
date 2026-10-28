
import { Suspense } from "react";
import Link from "next/link";

import { redirect, notFound } from "next/navigation";

import {
  getAuthenticatedUser,
  getUserConversationId,
} from "@/lib/server/auth";

import {
  findDocument,
} from "@/lib/server/repositories/document.repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function DocumentContent({ params }: PageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // The server, not the URL or an anonymous cookie,
  // determines the account's conversation.
  const conversationId =
    await getUserConversationId(user.id);

  const document = await findDocument(
    id,
    conversationId
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

      <h2>Extracted text</h2>

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
