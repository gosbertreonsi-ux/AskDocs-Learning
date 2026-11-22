import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser, getUserConversationId } from "@/lib/server/auth";
import { findDocument } from "@/lib/server/repositories/document.repository";
import styles from "./DocumentDetail.module.css";

type PageProps = { params: Promise<{ id: string }> };

async function DocumentContent({ params }: PageProps) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const conversationId = await getUserConversationId(user.id);
  const document = await findDocument(id, conversationId);
  if (!document) notFound();

  return (
    <article className={styles.article}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>DOCUMENT DETAILS</p>
        <h1>{document.name}</h1>
        <p>{(document.size / 1024).toFixed(1)} KB · Extracted text</p>
      </div>
      <section className={styles.reader} aria-labelledby="document-text-heading">
        <div className={styles.readerHeading}>
          <h2 id="document-text-heading">Document content</h2>
          <span>Selectable text</span>
        </div>
        <div className={styles.documentText}>{document.extractedText}</div>
      </section>
    </article>
  );
}

export default function DocumentPage({ params }: PageProps) {
  return (
    <div className={styles.page}>
      <Link href="/documents" className={styles.backLink}>Back to documents</Link>
      <Suspense fallback={<p>Loading document…</p>}>
        <DocumentContent params={params} />
      </Suspense>
    </div>
  );
}
