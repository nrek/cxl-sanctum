"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PricingMatrix from "@/components/PricingMatrix";
import { login } from "@/lib/api";

const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(45,212,191,0.25),transparent_55%),radial-gradient(ellipse_80%_60%_at_100%_50%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(ellipse_60%_50%_at_0%_80%,rgba(236,72,153,0.12),transparent_45%)]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#0f172a]/95 to-[#020617]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-stretch justify-center gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-0 max-w-xl lg:mb-0">
          <div className="mb-8 flex items-center gap-3">
            <span className="font-logo text-3xl font-normal tracking-[0.28em] text-white drop-shadow-sm sm:text-4xl">
              SANCTUM
            </span>
            <i
              className="fa-solid fa-key text-2xl text-teal-300/90 sm:text-3xl"
              aria-hidden
            />
          </div>
          <p className="mb-4 text-lg leading-relaxed text-slate-300/95 sm:text-xl">
            Secure SSH access orchestration for your teams and environments:
            distribute keys, manage assignments, and keep servers converged with
            what you define here.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Each account gets its own isolated workspace-projects, teams, members,
            and environments stay separate from everyone else&apos;s data.
          </p>
          <p className="text-sm text-slate-500">
            Built by{" "}
            <a
              href="https://craftxlogic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link-accent font-medium text-teal-300/95"
            >
              Craft/Logic&nbsp;
            </a>
            - product engineering for flexible infrastructure.
          </p>
        </div>

        <div className="w-full max-w-md shrink-0">
          <div className="sanctum-card border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
            <h2 className="mb-1 text-lg font-semibold text-sanctum-mist">
              Sign in
            </h2>
            <p className="mb-5 text-sm text-sanctum-muted">
              Welcome back. Sessions use a per-login token so switching accounts
              always starts fresh.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
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
          </div>
        </div>
        </div>

        <div className="flex flex-col items-center border-t border-white/5 pt-12">
          <PricingMatrix />
          {DONATION_URL ? (
            <p className="mt-8 max-w-md text-center text-xs text-slate-500">
              Enjoying SANCTUM?{" "}
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="link-accent"
              >
                Support the project
              </a>{" "}
              (optional).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
