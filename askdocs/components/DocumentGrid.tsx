import Link from "next/link";
import styles from "./DocumentGrid.module.css";

export type IndexStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type DocumentSummary = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  indexStatus: IndexStatus;
  indexError: string | null;
  indexedAt: string | null;
};

export function statusLabel(status: IndexStatus): string {
  if (status === "READY") return "Ready to search";
  if (status === "PROCESSING") return "Processing document";
  if (status === "FAILED") return "Indexing failed";
  return "Waiting to index";
}

export default function DocumentGrid({
  documents,
  onRetry,
  retryingId,
}: {
  documents: DocumentSummary[];
  onRetry?: (id: string) => void;
  retryingId?: string | null;
}) {
  return (
    <ul className={styles.grid} aria-label="Your documents">
      {documents.map((doc, index) => (
        <li key={doc.id} className={styles.card}>
          <p className={styles.date}>
            {new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <div className={styles.cardTitleRow}>
            <span aria-hidden="true" className={`${styles.dot} ${styles[doc.indexStatus.toLowerCase()]}`} />
            <Link className={styles.title} href={`/documents/${doc.id}`}>{doc.name}</Link>
          </div>
          <p className={styles.description}>{statusLabel(doc.indexStatus)}</p>
          <div className={styles.preview} aria-hidden="true">
            <span className={styles.previewFile}><span>PDF</span><i /><i /><i /></span>
            <span className={styles.previewNumber}>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className={styles.cardFooter}>
            <span>{(doc.size / 1024).toFixed(1)} KB</span>
            <span className={styles.status}>{doc.indexStatus.toLowerCase()}</span>
          </div>
          {doc.indexStatus === "FAILED" && onRetry && (
            <div className={styles.retryBlock}>
              <p title={doc.indexError ?? undefined}>{doc.indexError || "Indexing could not finish."}</p>
              <button type="button" onClick={() => onRetry(doc.id)} disabled={retryingId != null}>
                {retryingId === doc.id ? "Retrying…" : "Retry indexing"}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
