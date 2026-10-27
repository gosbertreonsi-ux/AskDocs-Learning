import "./globals.css";
import Link from "next/link";

export const metadata = { title: "AskDocs" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <h1>AskDocs</h1>
          <nav>
            <Link href="/">Chat</Link>
            <Link href="/documents">Documents</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}