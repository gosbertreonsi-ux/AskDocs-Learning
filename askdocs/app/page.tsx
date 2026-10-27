
import Link from "next/link";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main>
      <header style={{ padding: 20 }}>
        <Link href="/documents">
          My Documents
        </Link>
      </header>

      <Chat />
    </main>
  );
}
