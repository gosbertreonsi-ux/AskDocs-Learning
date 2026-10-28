
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import {
  getAuthenticatedUser,
} from "@/lib/server/auth";

async function DocumentsGuard({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}

export default function DocumentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<p>Checking session...</p>}>
      <DocumentsGuard>{children}</DocumentsGuard>
    </Suspense>
  );
}
