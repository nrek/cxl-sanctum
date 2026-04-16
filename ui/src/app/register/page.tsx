"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,rgba(45,212,191,0.2),transparent_50%)]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] to-[#020617]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="font-logo text-2xl font-normal tracking-[0.25em] text-sanctum-mist hover:text-white"
          >
            SANCTUM
          </Link>
          <i className="fa-solid fa-key text-sanctum-accent text-lg" aria-hidden />
        </div>
        <div className="sanctum-card space-y-4 p-8">
          <h1 className="text-lg font-semibold text-sanctum-mist">
            Create your workspace
          </h1>
          <p className="text-sm text-sanctum-muted">
            Get started with SANCTUM by creating your admin account for your own projects, teams, and environments.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Email (optional)"
                aria-label="Email (optional)"
                className="sanctum-input"
              />
            </div>
            <div>
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
            </div>
            <div>
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
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
            <p className="text-center text-xs leading-relaxed text-sanctum-muted">
              By creating an account, you agree to the{" "}
              <Link href="/terms" className="link-accent">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link-accent">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
          <p className="text-center text-sm text-sanctum-muted">
            Already have an account?{" "}
            <Link href="/login" className="link-accent">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
