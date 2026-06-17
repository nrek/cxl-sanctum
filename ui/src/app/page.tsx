"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-sanctum-bg">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_380px_at_88%_-8%,rgba(217,92,34,0.12),transparent_60%)]"
        aria-hidden
      />

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <BrandMark href="/" size="md" />
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-sanctum-muted hover:text-sanctum-mist">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary px-4 py-2 text-sm">
            Register
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <p className="label-caps mb-4">SSH access management</p>
        <h1 className="mb-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-sanctum-mist md:text-5xl">
          One dashboard for keys, teams, and server access.
        </h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-sanctum-muted">
          Sanctum distributes SSH keys and sudo membership to your servers through
          a pull-based provision script. Define users and environments here; each
          host converges on cron with a single cURL line. No agent required.
        </p>

        <div className="mb-12 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Open dashboard
          </Link>
          <Link href="/register" className="btn-secondary">
            Create workspace
          </Link>
        </div>

        <div className="sanctum-card space-y-4 p-6">
          <h2 className="font-display text-lg font-bold text-sanctum-mist">
            Self-hosted setup
          </h2>
          <p className="text-sm leading-relaxed text-sanctum-muted">
            Point this UI at your API by setting{" "}
            <code className="rounded bg-sanctum-terminal px-1.5 py-0.5 font-mono text-xs text-sanctum-mist">
              NEXT_PUBLIC_API_URL
            </code>{" "}
            at build time (must include the <code className="font-mono text-xs">/api</code>{" "}
            path). Run the Django API from{" "}
            <code className="font-mono text-xs">cxl-sanctum/server</code> or use the
            hosted SaaS API. See the project README for provision cron examples.
          </p>
          <p className="text-sm text-sanctum-faint">
            Looking for the Craft/Logic hosted offering? Visit{" "}
            <a
              href="https://sanctum.craftxlogic.com"
              className="link-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              sanctum.craftxlogic.com
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="relative z-10 mx-auto mt-16 flex max-w-4xl flex-wrap items-center gap-4 border-t border-sanctum-line px-6 py-8 text-xs text-sanctum-faint">
        <Link href="/privacy" className="link-accent">
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="link-accent">
          Terms
        </Link>
      </footer>
    </div>
  );
}
