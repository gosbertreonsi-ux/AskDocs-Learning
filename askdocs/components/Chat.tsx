"use client";

import { useState } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "ai", text: "Hello! Ask me about your documents." },
  ]);
  const [input, setInput] = useState("");

  // TODO(M1): load history with getMessages() and persist sends with sendMessage().
  // See docs/milestones/01-chat-persistence.md.
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Optimistically add user message to UI
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text }]);
    setInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const saved: Message = await res.json();
      console.log("Server replied:", saved);
      
      // Append the AI's actual response to the chat
      setMessages(prev => [...prev, saved]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
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
