import type { Message } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function getMessages(): Promise<Message[]> {
  return request<Message[]>("/messages");
}

export function sendMessage(text: string): Promise<Message> {
  return request<Message>("/messages", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function deleteMessage(id: number): Promise<void> {
  return request<void>(`/messages/${id}`, { method: "DELETE" });
}
