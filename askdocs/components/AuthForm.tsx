"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./AuthForm.module.css";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const registering = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");

    if (registering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Keep the existing AskDocs authentication endpoints unchanged.
      const response = await fetch(
        `/api/auth/${registering ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Authentication failed.");
      }

      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`askdocs-auth-screen ${styles.page}`}>
      <section className={styles.content} aria-labelledby="auth-title">
        <p className={styles.brand}>AskDocs</p>

        <nav className={styles.switcher} aria-label="Authentication pages">
          <Link href="/login" aria-current={!registering ? "page" : undefined}>
            Sign in
          </Link>
          <Link href="/register" aria-current={registering ? "page" : undefined}>
            Create account
          </Link>
        </nav>

        <div className={styles.heading}>
          <h1 id="auth-title">
            {registering ? "Create your account" : "Welcome back"}
          </h1>
          <p>
            {registering
              ? "Create an account to work with your documents."
              : "Sign in to continue to your documents."}
          </p>
        </div>

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete={registering ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={registering ? 12 : undefined}
              aria-describedby={registering ? "password-requirement" : undefined}
              required
              disabled={loading}
            />
            {registering && (
              <small id="password-requirement">At least 12 characters.</small>
            )}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                disabled={loading}
              />
              Show password
            </label>
          </div>

          {registering && (
            <div className={styles.field}>
              <label htmlFor="auth-confirm">Confirm password</label>
              <input
                id="auth-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {error && <p role="alert" className={styles.message}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait…" : registering ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className={styles.footer}>
          {registering ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link href={registering ? "/login" : "/register"}>
            {registering ? "Sign in" : "Register"}
          </Link>
        </p>
      </section>
    </main>
  );
}
