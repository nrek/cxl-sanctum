import Link from "next/link";
import BrandMark from "@/components/BrandMark";

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
    <div className="min-h-screen bg-sanctum-bg">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <BrandMark href="/" size="md" />
          <nav className="flex items-center gap-4 text-xs text-sanctum-muted">
            <Link href="/privacy" className="link-accent">
              Privacy
            </Link>
            <Link href="/terms" className="link-accent">
              Terms
            </Link>
          </nav>
        </div>

        <article className="sanctum-card flex-1 p-8">
          <h1 className="mb-2 font-display text-2xl font-bold text-sanctum-mist">
            {title}
          </h1>
          <p className="mb-8 text-sm text-sanctum-muted">
            Effective {effectiveDate}
          </p>
          <div className="prose-sanctum space-y-4 text-sm leading-relaxed text-sanctum-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-sanctum-mist [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>

        <p className="mt-8 text-center text-xs text-sanctum-faint">
          <Link href="/" className="link-accent">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
