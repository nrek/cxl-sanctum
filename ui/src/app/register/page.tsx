"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
import { registerAccount } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await registerAccount(username, password, email || undefined);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not create account.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sanctum-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark href="/" size="lg" />
        </div>
        <div className="sanctum-card space-y-4 p-8">
          <h1 className="font-display text-lg font-bold text-sanctum-mist">
            Create your workspace
          </h1>
          <p className="text-sm text-sanctum-muted">
            Admin account for projects, teams, members, and environments.
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="Email (optional)"
              aria-label="Email (optional)"
              className="sanctum-input"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Password"
              aria-label="Password"
              className="sanctum-input"
            />
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              aria-label="Confirm password"
              className="sanctum-input"
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating…" : "Create workspace →"}
            </button>
            <p className="text-center text-xs leading-relaxed text-sanctum-muted">
              By registering you agree to the{" "}
              <Link href="/terms" className="link-accent">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link-accent">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
          <p className="text-center text-sm text-sanctum-muted">
            Already have a workspace?{" "}
            <Link href="/login" className="link-accent">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
