import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/server/auth";
import WorkspaceShell from "@/components/WorkspaceShell";

async function DocumentsGuard({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return <WorkspaceShell email={user.email}>{children}</WorkspaceShell>;
}

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Checking session…</p>}>
      <DocumentsGuard>{children}</DocumentsGuard>
    </Suspense>
  );
}
