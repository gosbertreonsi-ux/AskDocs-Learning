import { Suspense } from "react";
import { redirect } from "next/navigation";
import Chat from "@/components/Chat";
import RecentDocuments from "@/components/RecentDocuments";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getAuthenticatedUser } from "@/lib/server/auth";
import styles from "./WorkspaceHome.module.css";

async function PrivateHome() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return (
    <WorkspaceShell email={user.email}>
      <div className={styles.home}>
        <div className={styles.titleBar}>
          <div><p className={styles.eyebrow}>YOUR SPACE</p><h1>Overview</h1></div>
          <p>Find your PDFs, explore answers, and keep learning.</p>
        </div>
        <RecentDocuments />
        <section id="askdocs-chat" className={styles.chatSection} aria-labelledby="askdocs-chat-heading">
          <div className={styles.chatTitle}><h2 id="askdocs-chat-heading">Ask your documents</h2><p>Search for grounded answers from your own uploaded files.</p></div>
          <Chat />
        </section>
      </div>
    </WorkspaceShell>
  );
}
export default function Home() {
  return <Suspense fallback={<p style={{ padding: 24 }}>Loading workspace…</p>}><PrivateHome /></Suspense>;
}
