import Link from 'next/link';
import type { Message } from '@/lib/types';

// Server-created source lines are links; all other content stays escaped text.
const SOURCE_LINE = /^\[(\d+)\] (.+) \(\/documents\/([a-zA-Z0-9-]+)\)$/;

export default function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {message.text.split('\n').map((line, i) => {
        const source = message.role === 'ai' ? line.match(SOURCE_LINE) : null;
        return (
          <div key={i}>
            {source ? (
              <Link href={`/documents/${source[3]}`}>
                [{source[1]}] {source[2]}
              </Link>
            ) : (line || '\u00a0')}
          </div>
        );
      })}
    </div>
  );
}
