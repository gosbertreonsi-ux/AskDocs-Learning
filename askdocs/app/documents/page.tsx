
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type DocumentSummary = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] =
    useState<DocumentSummary[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDocuments() {
    const response = await fetch("/api/documents", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not load documents");
    }

    const data: DocumentSummary[] =
      await response.json();

    setDocuments(data);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load documents");
        }

        const data: DocumentSummary[] =
          await response.json();

        if (active) setDocuments(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unexpected error"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file || uploading) return;

    setError("");
    setSuccess("");
    setUploading(true);

    const data = new FormData();
    data.append("file", file);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Upload failed"
        );
      }

      await loadDocuments();

      setSuccess(
  result.indexed
    ? "Document uploaded and indexed successfully!"
    : "Document saved, but indexing failed. Check the server logs."
);
      setFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <Link href="/">Back to chat</Link>

      <h1>My Documents</h1>

      <form onSubmit={upload}>
        <input
          key={file ? file.name : "empty"}
          type="file"
          accept=".pdf,application/pdf"
          onChange={e =>
            setFile(e.target.files?.[0] ?? null)
          }
        />

        <button
          type="submit"
          disabled={!file || uploading}
        >
          {uploading ? "Processing..." : "Upload PDF"}
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
        <ul>
          {documents.map(doc => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>
                {doc.name}
              </Link>
              {" — "}
              {(doc.size / 1024).toFixed(1)} KB
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
