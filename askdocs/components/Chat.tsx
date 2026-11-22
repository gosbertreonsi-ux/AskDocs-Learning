"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import styles from "./Chat.module.css";

const welcome: Message = {
  id: 0,
  role: "ai",
  text: "Welcome to AskDocs. Upload a document, then ask me a question about it. I'll point you toward the supporting passages.",
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadMessages() {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load messages");
        const data = (await response.json()) as Message[];
        if (active) setMessages(data.length ? data : [welcome]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load conversation history");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMessages();
    return () => { active = false; };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending || loading) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(typeof result?.error === "string" ? result.error : "Could not send your question");
      }
      const historyResponse = await fetch("/api/messages", { cache: "no-store" });
      if (!historyResponse.ok) throw new Error("Question saved, but history could not be refreshed");
      const history = (await historyResponse.json()) as Message[];
      setMessages(history);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className={styles.chatPanel} aria-label="Document conversation">
      <div className={styles.panelHeader}>
        <div>
          <h2>Conversation</h2>
          <p>Answers are based on your uploaded documents.</p>
        </div>
        <span className={styles.sessionLabel}>ASKDOCS AI</span>
      </div>
      <div id="messages" className={styles.messages} aria-live="polite" aria-relevant="additions">
        {loading ? <p className={styles.notice}>Loading messages…</p> :
          messages.map(message => <MessageBubble key={message.id} message={message} />)}
        {sending && <p className={styles.notice} role="status">Searching your documents…</p>}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <form onSubmit={send} className={styles.composer}>
        <label htmlFor="askdocs-question" className={styles.label}>Ask a question</label>
        <div className={styles.composerRow}>
          <textarea
            id="askdocs-question"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={onComposerKeyDown}
            maxLength={2000}
            rows={2}
            required
            disabled={loading || sending}
            placeholder="What does my document say about…?"
          />
          <button type="submit" disabled={loading || sending || !input.trim()}>
            {sending ? "Working…" : "Send"}
          </button>
        </div>
        <p className={styles.helper}>Enter to send · Shift + Enter for a new line · Verify important claims in the linked source.</p>
      </form>
    </section>
  );
}
