"use client";

import { useState } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "ai", text: "Hello! Ask me about your documents." },
  ]);
  const [input, setInput] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages(prev => [...prev, { id: Date.now(), role: "user", text }]);
    setInput("");

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: "ai", text: "You asked: " + text },
      ]);
    }, 1000);
  }

  return (
    <div className="chat">
      <div id="messages">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <form onSubmit={send}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your documents..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

/* useEffect runs code after the component appears, for things like fetching data:
import { useEffect, useState } from "react";

const [docs, setDocs] = useState<string[]>([]);

useEffect(() => {
  fetch("/api/documents")
    .then(r => r.json())
    .then(setDocs);
}, []);          // [] means "run once, when the component first appears"

*/