"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "./DocumentsPage.module.css";

type IndexStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
type DocumentSummary = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  indexStatus: IndexStatus;
  indexError: string | null;
  indexedAt: string | null;
};

function humanSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load documents");
    setDocuments((await response.json()) as DocumentSummary[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        await loadDocuments();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialLoad();
    return () => { active = false; };
  }, [loadDocuments]);

  const hasActiveIndexing = documents.some(doc =>
    doc.indexStatus === "PENDING" || doc.indexStatus === "PROCESSING"
  );

  useEffect(() => {
    if (!hasActiveIndexing) return;
    const timer = setInterval(() => { void loadDocuments().catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [hasActiveIndexing, loadDocuments]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) return;
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Choose a PDF between 1 byte and 5 MB.");
      return;
    }
    setError("");
    setSuccess("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Upload failed");
      await loadDocuments();
      setSuccess(result.indexStatus === "FAILED"
        ? "Document saved, but indexing could not be queued. Try Retry indexing."
        : "Document saved. Indexing will continue in the background.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function retryIndex(documentId: string) {
    setRetryingId(documentId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/documents/${documentId}/retry`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Retry failed");
      setSuccess("Indexing retry queued.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  const ready = documents.filter(doc => doc.indexStatus === "READY").length;
  const processing = documents.filter(doc =>
    doc.indexStatus === "PENDING" || doc.indexStatus === "PROCESSING").length;
  const visible = documents.filter(doc => doc.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section className={styles.library} aria-labelledby="documents-heading">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>YOUR KNOWLEDGE BASE</p>
          <h1 id="documents-heading">Document library</h1>
          <p>Upload, organize and search the documents behind your answers.</p>
        </div>
        <Link className={styles.chatLink} href="/">Go to chat</Link>
      </header>
      <div className={styles.stats} aria-label="Document summary">
        <div><strong>{documents.length}</strong><span>Total documents</span></div>
        <div><strong>{ready}</strong><span>Ready to search</span></div>
        <div><strong>{processing}</strong><span>Indexing</span></div>
      </div>
      <section className={styles.uploadPanel} aria-labelledby="upload-heading">
        <div className={styles.uploadText}>
          <h2 id="upload-heading">Add a document</h2>
          <p>PDF only · Maximum 5 MB · Selectable text required</p>
        </div>
        <form onSubmit={upload} className={styles.uploadForm}>
          <label htmlFor="askdocs-upload" className={styles.fileLabel}>Choose PDF</label>
          <input
            id="askdocs-upload" ref={inputRef} type="file" accept=".pdf,application/pdf"
            onChange={event => setFile(event.target.files?.[0] ?? null)}
          />
          <button type="submit" disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </form>
        {error && <p role="alert" className={styles.message}>{error}</p>}
        {success && <p role="status" className={styles.message}>{success}</p>}
      </section>
      <section className={styles.results} aria-labelledby="library-heading">
        <div className={styles.sectionTitle}>
          <div>
            <h2 id="library-heading">Your files</h2>
            <p>View documents and monitor indexing progress.</p>
          </div>
          <div className={styles.actions}>
            <label htmlFor="document-search" className={styles.srOnly}>Filter by filename</label>
            <input id="document-search" type="search" value={query}
              onChange={event => setQuery(event.target.value)} placeholder="Search filenames" />
            <button type="button" onClick={() => void loadDocuments().catch(err => setError(String(err)))}>
              Refresh
            </button>
          </div>
        </div>
        {loading ? <p className={styles.empty}>Loading documents…</p> :
          documents.length === 0 ? <div className={styles.empty}>No PDFs yet. Add your first document above.</div> :
          visible.length === 0 ? <div className={styles.empty}>No documents match your search.</div> : (
            <ul className={styles.docList}>
              {visible.map(doc => (
                <li key={doc.id} className={styles.docRow}>
                  <span className={styles.fileIcon} aria-hidden="true">PDF</span>
                  <div className={styles.fileInfo}>
                    <Link className={styles.fileName} href={`/documents/${doc.id}`}>{doc.name}</Link>
                    <p>{humanSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                    {doc.indexStatus === "FAILED" && (
                      <div className={styles.failed}>
                        <span>{doc.indexError || "Indexing failed."}</span>
                        <button type="button" onClick={() => void retryIndex(doc.id)} disabled={retryingId !== null}>
                          {retryingId === doc.id ? "Retrying…" : "Retry indexing"}
                        </button>
                      </div>
                    )}
                  </div>
                  <span aria-label={`Indexing status: ${doc.indexStatus.toLowerCase()}`}
                    className={`${styles.status} ${styles[doc.indexStatus.toLowerCase()]}`}>
                    {doc.indexStatus === "READY" ? "Ready" :
                     doc.indexStatus === "FAILED" ? "Failed" :
                     doc.indexStatus === "PROCESSING" ? "Processing" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </section>
    </section>
  );
}
