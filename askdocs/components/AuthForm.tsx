
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthForm({
  mode,
}: {
  mode: Mode;
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const registering = mode === "register";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/auth/${registering ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Authentication failed"
        );
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "60px auto",
        padding: 24,
      }}
    >
      <h1>
        {registering
          ? "Create your AskDocs account"
          : "Welcome back"}
      </h1>

      <p>
        {registering
          ? "Start your private document workspace."
          : "Sign in to access your documents."}
      </p>

      <form onSubmit={submit}>
        <label htmlFor="auth-email">Email</label>

        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          style={{ display: "block", width: "100%" }}
        />

        <label htmlFor="auth-password">
          Password
        </label>

        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={
            registering ? "new-password" : "current-password"
          }
          minLength={registering ? 12 : undefined}
          required
          style={{ display: "block", width: "100%" }}
        />

        {registering && (
          <p>
            Use at least 12 characters.
          </p>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : registering
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p>
        {registering
          ? "Already have an account?"
          : "Don't have an account?"}
        {" "}
        <Link href={registering ? "/login" : "/register"}>
          {registering ? "Sign in" : "Register"}
        </Link>
      </p>
    </main>
  );
}
