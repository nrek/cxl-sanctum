import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
};

const sizes = {
  sm: { icon: 24, text: "text-base" },
  md: { icon: 30, text: "text-lg" },
  lg: { icon: 32, text: "text-xl" },
};

function KeyholeIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" className="text-sanctum-accent" />
      <circle cx="16" cy="13" r="3.4" fill="#0d1018" />
      <path d="M13.4 14.8 L11.9 22 h8.2 l-1.5-7.2 z" fill="#0d1018" />
    </svg>
  );
}

export default function BrandMark({
  href,
  size = "md",
  showWordmark = true,
  subtitle,
  className = "",
}: BrandMarkProps) {
  const s = sizes[size];
  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <KeyholeIcon size={s.icon} />
      {showWordmark ? (
        <div className="min-w-0">
          <span
            className={`font-display font-extrabold tracking-tight text-sanctum-mist ${s.text}`}
          >
            Sanctum
          </span>
          {subtitle ? (
            <div className="truncate text-[11.5px] text-sanctum-muted">
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }

  return inner;
}
