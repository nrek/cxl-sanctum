import Link from "next/link";

type MetricCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  href?: string;
  onClick?: () => void;
};

export default function MetricCard({
  label,
  value,
  sublabel,
  href,
  onClick,
}: MetricCardProps) {
  const className =
    "block sanctum-card p-5 transition-colors hover:border-sanctum-line-strong " +
    (href || onClick ? "cursor-pointer" : "");

  const content = (
    <>
      <div className="label-caps mb-3.5">{label}</div>
      <div className="font-display text-4xl font-extrabold tabular-nums leading-none tracking-tight text-sanctum-mist">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-2 text-sm text-sanctum-muted">{sublabel}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
