import Link from "next/link";

interface LegalPageProps {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export default function LegalPage({
  title,
  effectiveDate,
  children,
}: LegalPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(45,212,191,0.18),transparent_55%)]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#0f172a]/95 to-[#020617]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-logo text-xl tracking-[0.25em] text-sanctum-mist hover:text-white"
          >
            SANCTUM
            <i
              className="fa-solid fa-key text-sanctum-accent text-base"
              aria-hidden
            />
          </Link>
          <nav className="flex items-center gap-4 text-xs text-sanctum-muted">
            <Link href="/privacy" className="link-accent">
              Privacy
            </Link>
            <Link href="/terms" className="link-accent">
              Terms
            </Link>
            <Link href="/" className="link-accent">
              Home
            </Link>
          </nav>
        </div>

        <article className="sanctum-card border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
          <header className="mb-6 border-b border-sanctum-line/20 pb-4">
            <h1 className="text-2xl font-semibold text-sanctum-mist">{title}</h1>
            <p className="mt-1 text-xs text-sanctum-muted">
              Effective date: {effectiveDate}
            </p>
          </header>
          <div className="legal-prose text-sm leading-relaxed text-slate-300 [&_a]:link-accent [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-sanctum-mist [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-sanctum-mist [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:text-sanctum-mist">
            {children}
          </div>
        </article>

        <footer className="mt-10 text-center text-xs text-sanctum-muted">
          <p>
            Craft and Logic, Inc. — 1321 Upland Dr., PMB 20350, Houston, Texas
            77043, US
          </p>
          <p className="mt-1">
            <a href="mailto:support@craftxlogic.com" className="link-accent">
              support@craftxlogic.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
