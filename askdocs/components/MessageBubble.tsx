import type { Message } from "@/lib/types";

export default function MessageBubble({ message }: { message: Message }) {
  return <p className={`message ${message.role}`}>{message.text}</p>;
}