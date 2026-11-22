"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type DocumentSummary = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  indexStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  indexError: string | null;
  indexedAt: string | null;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load documents");
    const result: DocumentSummary[] = await response.json();
    setDocuments(result);
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

  const hasActiveIndexing = documents.some(
    doc => doc.indexStatus === "PENDING" || doc.indexStatus === "PROCESSING"
  );

  useEffect(() => {
    if (!hasActiveIndexing) return;
    const timer = setInterval(() => { void loadDocuments().catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [hasActiveIndexing, loadDocuments]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || uploading) return;
    setError("");
    setSuccess("");
    setUploading(true);
    const data = new FormData();
    data.append("file", file);

    try {
      const response = await fetch("/api/documents", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      await loadDocuments();
      setSuccess(result.indexStatus === "FAILED"
        ? "Document saved, but indexing could not be queued. Use Retry indexing."
        : "Document saved. Indexing is running in the background.");
      setFile(null);
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Retry failed");
      setSuccess("Indexing retry queued.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <Link href="/">Back to chat</Link>
      <h1>My Documents</h1>
      <form onSubmit={upload} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          key={file ? file.name : "empty"}
          type="file"
          accept=".pdf,application/pdf"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      <h2>Uploaded Documents</h2>
      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents uploaded yet.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
          {documents.map(doc => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{doc.name}</Link>
              {" — "}{(doc.size / 1024).toFixed(1)} KB
              <div aria-live="polite">Indexing: {doc.indexStatus.toLowerCase()}</div>
              {doc.indexStatus === "FAILED" && (
                <div>
                  <p>{doc.indexError || "Indexing failed."}</p>
                  <button
                    type="button"
                    onClick={() => void retryIndex(doc.id)}
                    disabled={retryingId !== null}
                  >
                    {retryingId === doc.id ? "Retrying..." : "Retry indexing"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
