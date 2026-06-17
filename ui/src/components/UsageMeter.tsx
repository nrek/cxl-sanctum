type UsageMeterProps = {
  label: string;
  current: number;
  limit: number | null;
  showUpgradeHint?: boolean;
};

export default function UsageMeter({
  label,
  current,
  limit,
  showUpgradeHint = false,
}: UsageMeterProps) {
  const atCap = limit !== null && current >= limit;
  const pct =
    limit !== null && limit > 0
      ? Math.min(100, Math.round((current / limit) * 100))
      : 0;

  return (
    <div className="flex-1">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
        <span className="label-caps">{label}</span>
        <span className="font-display text-xl font-extrabold tabular-nums text-sanctum-mist">
          {current}
          {limit !== null ? (
            <span className="text-base font-medium text-sanctum-muted">
              {" "}
              / {limit}
            </span>
          ) : (
            <span className="text-base font-medium text-sanctum-muted">
              {" "}
              (unlimited)
            </span>
          )}
        </span>
        {atCap && showUpgradeHint ? (
          <span className="text-xs font-semibold text-warning">
            Free limit reached
          </span>
        ) : null}
      </div>
      {limit !== null ? (
        <div className="h-1.5 overflow-hidden rounded bg-sanctum-bg">
          <div
            className={`h-full rounded transition-all ${
              atCap
                ? "bg-gradient-to-r from-warning to-danger"
                : "bg-sanctum-accent"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
