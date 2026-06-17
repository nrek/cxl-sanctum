import type { HeartbeatRhythmStatus } from "@/lib/api";

type HeartbeatRhythmProps = {
  windows: boolean[];
  status: HeartbeatRhythmStatus;
};

/** Twelve dots: last 60 minutes in 5-minute buckets (oldest → newest, left → right). */
export function HeartbeatRhythm({ windows, status }: HeartbeatRhythmProps) {
  const dots = Array.from({ length: 12 }, (_, i) => Boolean(windows[i]));
  const missedTone =
    status === "offline" || status === "degrading"
      ? "bg-danger/55 ring-1 ring-danger/25"
      : "bg-warning/80 ring-1 ring-warning/20";
  const healthyTone = "bg-success ring-1 ring-success/25";

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Heartbeat rhythm over the last hour: ${status.replace(/_/g, " ")}`}
    >
      {dots.map((ok, index) => (
        <span
          key={index}
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
            ok ? healthyTone : missedTone
          }`}
        />
      ))}
    </div>
  );
}
