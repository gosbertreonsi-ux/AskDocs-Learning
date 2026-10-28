
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Chat from "@/components/Chat";
import SignOutButton from "@/components/SignOutButton";

import {
  getAuthenticatedUser,
} from "@/lib/server/auth";

async function PrivateHome() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 20,
          gap: 16,
        }}
      >
        <div>
          <p>Signed in as {user.email}</p>
          <Link href="/documents">My Documents</Link>
        </div>

        <SignOutButton />
      </header>

      <Chat />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p>Loading workspace...</p>}>
      <PrivateHome />
    </Suspense>
  );
}
