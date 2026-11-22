import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Chat from "@/components/Chat";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getAuthenticatedUser } from "@/lib/server/auth";
import styles from "./WorkspaceHome.module.css";

async function PrivateHome() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <WorkspaceShell email={user.email}>
      <section className={styles.home} aria-labelledby="chat-heading">
        <div className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>YOUR RESEARCH ASSISTANT</p>
            <h1 id="chat-heading">Ask better questions.<br />Find grounded answers.</h1>
            <p className={styles.intro}>
              Explore what your documents actually say. AskDocs retrieves passages
              and links to the sources behind its answers.
            </p>
          </div>
          <Link href="/documents" className={styles.documentsLink}>My document library</Link>
        </div>
        <div className={styles.tipRow} aria-label="Getting started">
          <span><b>01</b> Upload a PDF</span>
          <span><b>02</b> Ask a question</span>
          <span><b>03</b> Check the sources</span>
        </div>
        <Chat />
      </section>
    </WorkspaceShell>
  );
}

export default function Home() {
  return <Suspense fallback={<p style={{ padding: 24 }}>Loading workspace…</p>}><PrivateHome /></Suspense>;
}
