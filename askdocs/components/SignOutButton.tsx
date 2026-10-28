
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Sign out failed");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign out"
      );
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={signOut} disabled={loading}>
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
