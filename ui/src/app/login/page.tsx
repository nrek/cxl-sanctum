"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not reach the server. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sanctum-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-2">
          <span className="font-logo text-2xl font-normal tracking-[0.25em] text-sanctum-mist">
            SANCTUM
          </span>
          <i className="fa-solid fa-key text-sanctum-accent text-lg" aria-hidden />
        </div>
        <form onSubmit={handleSubmit} className="sanctum-card space-y-4 p-8">
          {error && (
            <div
              className="rounded-md border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Username"
              aria-label="Username"
              className="sanctum-input"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              className="sanctum-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="link-accent">
            Forgot password?
          </Link>
          <Link href="/register" className="link-accent">
            Create an account
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-sanctum-muted">
          <Link href="/" className="link-accent">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
