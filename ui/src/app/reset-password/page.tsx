"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { confirmPasswordReset } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("This page needs a valid reset link from your email.");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(uid, token, password);
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sanctum-card space-y-4 p-8">
      <h1 className="text-lg font-semibold text-sanctum-mist">Set new password</h1>
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
          <label className="mb-1 block text-sm font-medium text-sanctum-mist">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="sanctum-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-sanctum-mist">
            Confirm password
          </label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            autoComplete="new-password"
            className="sanctum-input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Saving..." : "Update password"}
        </button>
      </form>
      <p className="text-center text-sm text-sanctum-muted">
        <Link href="/login" className="link-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="sanctum-card p-8 text-sanctum-muted">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
