
import type { Message } from "@/lib/types";

export default function MessageBubble({
  message,
}: {
  message: Message;
}) {
  return (
    <p
      className={`message ${message.role}`}
      style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {message.text}
    </p>
  );
}
