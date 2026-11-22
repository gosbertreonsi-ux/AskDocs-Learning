import Link from "next/link";
import type { Message } from "@/lib/types";
import styles from "./MessageBubble.module.css";

const SOURCE_LINE = /^\[(\d+)\] (.+) \(\/documents\/([a-zA-Z0-9-]+)\)$/;

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <article className={`${styles.bubbleRow} ${isUser ? styles.userRow : styles.aiRow}`}>
      <div className={styles.role} aria-label={isUser ? "You" : "AskDocs"}>
        {isUser ? "You" : "AskDocs"}
      </div>
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
        {message.text.split("\n").map((line, index) => {
          const source = !isUser ? line.match(SOURCE_LINE) : null;
          return (
            <div key={index} className={styles.line}>
              {source ? (
                <Link href={`/documents/${source[3]}`} className={styles.sourceLink}>
                  [{source[1]}] {source[2]}
                </Link>
              ) : (line || "\u00a0")}
            </div>
          );
        })}
      </div>
    </article>
  );
}
