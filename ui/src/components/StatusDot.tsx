type StatusVariant = "success" | "warning" | "danger" | "muted" | "neutral";

const variantClass: Record<StatusVariant, string> = {
  success: "bg-success shadow-[0_0_10px_theme(colors.success.DEFAULT)]",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-sanctum-faint",
  neutral: "bg-sanctum-line",
};

type StatusDotProps = {
  variant?: StatusVariant;
  size?: "sm" | "md";
  label?: string;
  className?: string;
};

export default function StatusDot({
  variant = "neutral",
  size = "sm",
  label,
  className = "",
}: StatusDotProps) {
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${dim} ${variantClass[variant]} ${className}`}
      title={label}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}
