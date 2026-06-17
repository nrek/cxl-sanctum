"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sanctum-terminal via-sanctum-surface to-sanctum-bg p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(560px_360px_at_12%_0%,rgba(217,92,34,0.16),transparent_60%)]"
          aria-hidden
        />
        <BrandMark href="/" size="lg" className="relative" />
        <div className="relative max-w-md">
          <p className="label-caps mb-5">SSH access management</p>
          <h1 className="mb-6 font-display text-4xl font-extrabold leading-tight tracking-tight">
            Pick up where access left off.
          </h1>
          <div className="code-panel text-xs">
            <div className="text-sanctum-faint">sanctum: authenticating workspace…</div>
            <div>
              <span className="text-success"> ok </span>workspace ready
            </div>
          </div>
        </div>
        <p className="relative text-xs text-sanctum-faint">
          Self-hosted or hosted — same dashboard experience.
        </p>
      </div>

      <div className="flex items-center justify-center bg-sanctum-bg p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark href="/" />
          </div>
          <h2 className="mb-1 font-display text-2xl font-bold text-sanctum-mist">
            Welcome back
          </h2>
          <p className="mb-6 text-sm text-sanctum-muted">
            Sign in to your Sanctum workspace.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div
                className="rounded-sanctum-sm border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Username"
              aria-label="Username"
              className="sanctum-input font-mono text-sm"
            />
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
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
            <Link href="/forgot-password" className="link-accent">
              Forgot password?
            </Link>
            <Link href="/register" className="link-accent">
              Create workspace
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-sanctum-muted">
            <Link href="/" className="link-accent">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
