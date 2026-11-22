"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";
import styles from "./WorkspaceShell.module.css";

function Icon({ name }: { name: "overview" | "chat" | "documents" | "search" | "plus" }) {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {name === "overview" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
      {name === "chat" && <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-6A7.5 7.5 0 1 1 20 11.5Z" />}
      {name === "documents" && <><path d="M6 2.8h8l5 5V21H6a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h7M8 17h7" /></>}
      {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5" /></>}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

export default function WorkspaceShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Overview", icon: "overview" as const },
    { href: "/#askdocs-chat", label: "AI Chat", icon: "chat" as const },
    { href: "/documents", label: "Documents", icon: "documents" as const },
  ];
  return (
    <div className={`askdocs-workspace ${styles.workspace}`}>
      <a href="#workspace-content" className={styles.skipLink}>Skip to content</a>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <Link href="/" className={styles.brand} aria-label="AskDocs overview">
          <span className={styles.brandMark} aria-hidden="true"><span /></span>
          <span className={styles.brandName}>AskDocs<span className={styles.brandSubtitle}>Knowledge workspace</span></span>
        </Link>
        <div className={styles.sidebarLabel}>WORKSPACE</div>
        <nav className={styles.navigation} aria-label="Primary navigation">
          {links.map(link => {
            const active = link.href === "/" ? pathname === "/" :
              link.href === "/documents" ? pathname.startsWith("/documents") : false;
            return <Link key={link.href} href={link.href}
              className={`${styles.navLink} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}>
              <Icon name={link.icon}/><span>{link.label}</span>
            </Link>;
          })}
        </nav>
        <div className={styles.sidebarLabel}>LIBRARY SHORTCUTS</div>
        <nav className={styles.shortcutNav} aria-label="Library filters">
          <Link href="/documents"><span className={`${styles.dot} ${styles.gold}`} />All documents</Link>
          <Link href="/documents?status=READY"><span className={`${styles.dot} ${styles.mint}`} />Ready files</Link>
          <Link href="/documents?status=PROCESSING"><span className={`${styles.dot} ${styles.coral}`} />Indexing</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.footerLabel}>ASKDOCS WORKSPACE</span>
          <div className={styles.signOut}><SignOutButton /></div>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <form action="/documents" method="get" role="search" className={styles.searchForm}>
            <Icon name="search" />
            <label className={styles.visuallyHidden} htmlFor="workspace-search">Search your PDFs</label>
            <input id="workspace-search" type="search" name="q" placeholder="Search your documents" />
          </form>
          <div className={styles.topActions}>
            <Link href="/documents#upload" className={styles.addLink}><Icon name="plus"/><span>Add document</span></Link>
            <span className={styles.avatar} aria-hidden="true">{email[0]?.toUpperCase() || "A"}</span>
            <div className={styles.hello}><span>Hello,</span><strong title={email}>{email.split("@")[0]}</strong></div>
          </div>
        </header>
        <main id="workspace-content" className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
