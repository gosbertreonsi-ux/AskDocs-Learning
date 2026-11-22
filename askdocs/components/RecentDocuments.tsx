"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DocumentGrid, { type DocumentSummary, type IndexStatus } from "./DocumentGrid";
import styles from "./RecentDocuments.module.css";

type Tab = "ALL" | "READY" | "PROCESSING" | "FAILED";
const tabs: { value: Tab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "PROCESSING", label: "Indexing" },
  { value: "FAILED", label: "Failed" },
];
function matches(status: IndexStatus, tab: Tab) {
  if (tab === "ALL") return true;
  if (tab === "PROCESSING") return status === "PROCESSING" || status === "PENDING";
  return status === tab;
}
export default function RecentDocuments() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/documents", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load your documents");
    const data = (await response.json()) as DocumentSummary[];
    setDocs(data);
  }, []);
  useEffect(() => {
    let active = true;
    async function start() {
      try { await load(); }
      catch (err) { if (active) setError(err instanceof Error ? err.message : "Loading failed"); }
      finally { if (active) setLoading(false); }
    }
    void start();
    return () => { active = false; };
  }, [load]);
  const active = docs.some(doc => doc.indexStatus === "PENDING" || doc.indexStatus === "PROCESSING");
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { void load().catch(() => undefined); }, 4000);
    return () => clearInterval(id);
  }, [active, load]);
  const filtered = docs.filter(doc => matches(doc.indexStatus, tab)).slice(0, 12);
  return (
    <section aria-labelledby="recent-documents-heading" className={styles.section}>
      <div className={styles.heading}>
        <div><h2 id="recent-documents-heading">Your documents</h2><p>Recent files in your knowledge workspace</p></div>
        <Link className={styles.viewAll} href="/documents">View all documents</Link>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter documents by indexing status">
          {tabs.map(item => <button key={item.value} type="button" onClick={() => setTab(item.value)}
            className={tab === item.value ? styles.selected : ""} aria-pressed={tab === item.value}>
            {item.label}
          </button>)}
        </div>
        <Link href="/documents#upload" className={styles.add}>⊕ Add document</Link>
      </div>
      {error && <p role="alert" className={styles.notice}>{error}</p>}
      {loading ? <p className={styles.notice}>Loading documents…</p> :
        filtered.length ? <DocumentGrid documents={filtered} /> :
        <div className={styles.empty}><p>{docs.length ? "No files in this category." : "No documents yet. Upload your first PDF to begin."}</p><Link href="/documents#upload">Open document uploader</Link></div>}
    </section>
  );
}
