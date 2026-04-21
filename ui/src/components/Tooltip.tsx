"use client";

const SIDE_CLASSES = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
} as const;

export default function Tooltip({
  label,
  children,
  side = "top",
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  side?: keyof typeof SIDE_CLASSES;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[100] whitespace-nowrap rounded border border-sanctum-line/40 bg-sanctum-ink px-2 py-1.5 text-xs text-sanctum-mist opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${SIDE_CLASSES[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
