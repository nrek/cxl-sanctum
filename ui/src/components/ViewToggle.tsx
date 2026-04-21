"use client";

type ViewMode = "tiles" | "rows";

export default function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-sanctum-line/25">
      <button
        type="button"
        onClick={() => onChange("tiles")}
        className={`px-2.5 py-1.5 text-sm transition-colors ${
          mode === "tiles"
            ? "bg-sanctum-accent/25 text-sanctum-mist"
            : "bg-sanctum-surface2 text-sanctum-muted hover:text-sanctum-mist"
        }`}
        aria-label="Tile view"
        title="Tile view"
      >
        <i className="fa-solid fa-grip" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange("rows")}
        className={`px-2.5 py-1.5 text-sm transition-colors ${
          mode === "rows"
            ? "bg-sanctum-accent/25 text-sanctum-mist"
            : "bg-sanctum-surface2 text-sanctum-muted hover:text-sanctum-mist"
        }`}
        aria-label="Row view"
        title="Row view"
      >
        <i className="fa-solid fa-list" aria-hidden />
      </button>
    </div>
  );
}
