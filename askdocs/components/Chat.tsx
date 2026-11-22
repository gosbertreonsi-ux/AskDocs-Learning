'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';

const welcome: Message = {
  id: 0,
  role: 'ai',
  text: 'Hello! Ask me about your documents.',
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/messages', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load history');
        const data: Message[] = await response.json();
        if (active) setMessages(data.length ? data : [welcome]);
      } catch {
        if (active) setError('Could not load conversation history');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending || loading) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          typeof result?.error === 'string' ? result.error : 'Message could not be saved'
        );
      }
      const historyResponse = await fetch('/api/messages', { cache: 'no-store' });
      if (!historyResponse.ok) throw new Error('Could not reload messages');
      setMessages((await historyResponse.json()) as Message[]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat">
      <div id="messages" aria-live="polite">
        {loading ? <p>Loading messages...</p> :
          messages.map(message => <MessageBubble key={message.id} message={message} />)}
      </div>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={send}>
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          maxLength={2000}
          required
          disabled={loading || sending}
          aria-label="Question about your documents"
          placeholder="Ask about your documents..."
        />
        <button type="submit" disabled={loading || sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
