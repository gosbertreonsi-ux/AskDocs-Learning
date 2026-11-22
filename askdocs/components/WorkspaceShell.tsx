"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";
import styles from "./WorkspaceShell.module.css";

export default function WorkspaceShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Chat" },
    { href: "/documents", label: "Documents" },
  ];

  return (
    <div className={`askdocs-workspace ${styles.workspace}`}>
      <a className={styles.skipLink} href="#workspace-content">Skip to content</a>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <Link className={styles.brand} href="/" aria-label="AskDocs home">
          <span className={styles.brandMark} aria-hidden="true">A</span>
          <span className={styles.brandText}>
            <strong>AskDocs</strong>
            <small>Document intelligence</small>
          </span>
        </Link>
        <div className={styles.navLabel}>WORKSPACE</div>
        <nav className={styles.nav} aria-label="Main navigation">
          {links.map(link => {
            const active = link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navDot} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.account}>
            <span className={styles.avatar} aria-hidden="true">{email[0]?.toUpperCase() || "A"}</span>
            <div className={styles.accountText}>
              <strong>Signed in</strong>
              <span title={email}>{email}</span>
            </div>
          </div>
          <div className={styles.signOut}><SignOutButton /></div>
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topEyebrow}>YOUR WORKSPACE</span>
            <p className={styles.topTitle}>Read, explore, understand.</p>
          </div>
          <Link className={styles.quickUpload} href="/documents">Upload a document</Link>
        </header>
        <main className={styles.content} id="workspace-content">{children}</main>
      </div>
    </div>
  );
}
