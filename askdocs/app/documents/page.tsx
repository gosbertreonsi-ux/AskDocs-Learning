"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import DocumentGrid, { type DocumentSummary, type IndexStatus } from "@/components/DocumentGrid";
import styles from "./DocumentsPage.module.css";

type Tab = "ALL" | "READY" | "PROCESSING" | "FAILED";
const tabs: { value: Tab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "PROCESSING", label: "Indexing" },
  { value: "FAILED", label: "Failed" },
];
function matches(status: IndexStatus, tab: Tab): boolean {
  if (tab === "ALL") return true;
  if (tab === "PROCESSING") return status === "PENDING" || status === "PROCESSING";
  return status === tab;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    const status = params.get("status");
    if (status && tabs.some(item => item.value === status)) setTab(status as Tab);
  }, []);

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load documents");
    setDocuments((await response.json()) as DocumentSummary[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try { await loadDocuments(); }
      catch (err) { if (active) setError(err instanceof Error ? err.message : "Unexpected error"); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [loadDocuments]);

  const indexing = documents.some(doc => doc.indexStatus === "PENDING" || doc.indexStatus === "PROCESSING");
  useEffect(() => {
    if (!indexing) return;
    const timer = setInterval(() => { void loadDocuments().catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [indexing, loadDocuments]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) return;
    if (file.size === 0 || file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF between 1 byte and 5 MB.");
      return;
    }
    setError(""); setSuccess(""); setUploading(true);
    const form = new FormData(); form.append("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Upload failed");
      await loadDocuments();
      setSuccess(result.indexStatus === "FAILED" ?
        "Document saved, but indexing was not queued. Try Retry indexing." :
        "Document saved. Indexing is running in the background.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  async function retryIndex(id: string) {
    setRetryingId(id); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/documents/${id}/retry`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Retry failed");
      setSuccess("Indexing retry queued.");
      await loadDocuments();
    } catch (err) { setError(err instanceof Error ? err.message : "Retry failed"); }
    finally { setRetryingId(null); }
  }

  const visible = documents.filter(doc =>
    doc.name.toLowerCase().includes(query.trim().toLowerCase()) && matches(doc.indexStatus, tab)
  );
  const ready = documents.filter(doc => doc.indexStatus === "READY").length;
  const processing = documents.filter(doc => doc.indexStatus === "PROCESSING" || doc.indexStatus === "PENDING").length;

  return (
    <section className={styles.library} aria-labelledby="documents-heading">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>YOUR SPACE</p>
          <h1 id="documents-heading">Documents</h1>
          <p>All your PDFs, neatly organized for search and question answering.</p>
        </div>
        <Link href="/#askdocs-chat" className={styles.chatLink}>Ask AI about files</Link>
      </div>
      <div className={styles.stats} aria-label="Document summary">
        <div><strong>{documents.length}</strong><span>All files</span></div>
        <div><strong>{ready}</strong><span>Ready to search</span></div>
        <div><strong>{processing}</strong><span>Indexing</span></div>
      </div>
      <section id="upload" className={styles.uploadPanel} aria-labelledby="upload-heading">
        <div><h2 id="upload-heading">Add a new document</h2><p>Upload a PDF up to 5 MB, with selectable text.</p></div>
        <form className={styles.uploadForm} onSubmit={upload}>
          <label htmlFor="askdocs-upload" className={styles.visuallyHidden}>Select a PDF file</label>
          <input ref={inputRef} id="askdocs-upload" type="file" accept=".pdf,application/pdf"
            onChange={event => setFile(event.target.files?.[0] ?? null)} />
          <button type="submit" disabled={!file || uploading}>{uploading ? "Uploading…" : "+ Upload PDF"}</button>
        </form>
        {error && <p role="alert" className={styles.message}>{error}</p>}
        {success && <p role="status" className={styles.message}>{success}</p>}
      </section>
      <section className={styles.filesSection} aria-labelledby="all-files-heading">
        <div className={styles.sectionTop}>
          <h2 id="all-files-heading">Your library</h2>
          <div className={styles.actions}>
            <label htmlFor="document-search" className={styles.visuallyHidden}>Filter documents by name</label>
            <input id="document-search" type="search" placeholder="Search filenames" value={query}
              onChange={event => setQuery(event.target.value)} />
            <button type="button" onClick={() => { void loadDocuments().catch(err => setError(String(err))); }}>Refresh</button>
          </div>
        </div>
        <div className={styles.tabs} role="group" aria-label="Filter documents by status">
          {tabs.map(item => <button key={item.value} type="button" aria-pressed={tab === item.value}
            className={tab === item.value ? styles.selected : ""} onClick={() => setTab(item.value)}>{item.label}</button>)}
        </div>
        {loading ? <p className={styles.empty}>Loading documents…</p> :
          visible.length ? <DocumentGrid documents={visible} onRetry={id => void retryIndex(id)} retryingId={retryingId} /> :
          <p className={styles.empty}>{documents.length ? "No documents match these filters." : "Your library is empty. Upload a PDF above."}</p>}
      </section>
    </section>
  );
}
