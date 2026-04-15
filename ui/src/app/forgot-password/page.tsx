"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const m = await requestPasswordReset(email);
      setMessage(m);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
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
            Reset password
          </h1>
          <p className="text-sm text-sanctum-muted">
            Enter the email on your account. If it matches, we&apos;ll send a
            reset link. Configure SMTP in production, or check the server log in
            development.
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
            {message && (
              <div
                className="rounded-md border border-success/30 bg-success-surface px-4 py-2 text-sm text-success"
                role="status"
              >
                {message}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-sanctum-mist">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="sanctum-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <p className="text-center text-sm text-sanctum-muted">
            <Link href="/login" className="link-accent">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
