
"use client";

import { useState, type FormEvent } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      text: "Hello! Ask me about your documents.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed (${response.status})`
        );
      }

      const reply: Message = await response.json();

      setMessages(prev => [...prev, reply]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat">
      <div id="messages">
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            message={m}
          />
        ))}
      </div>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={send}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your documents..."
        />

        <button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
