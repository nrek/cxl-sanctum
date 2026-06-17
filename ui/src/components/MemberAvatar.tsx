const PALETTE = [
  { bg: "bg-sanctum-accent", text: "text-white" },
  { bg: "bg-sanctum-teal", text: "text-[#08231f]" },
  { bg: "bg-[#5b74a6]", text: "text-white" },
  { bg: "bg-sanctum-elevated", text: "text-sanctum-muted" },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const u = parts[0] || "?";
  return u.slice(0, 2).toUpperCase();
}

type MemberAvatarProps = {
  name: string;
  username?: string;
  size?: "sm" | "md";
};

export default function MemberAvatar({
  name,
  username,
  size = "md",
}: MemberAvatarProps) {
  const seed = (username || name).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const palette = PALETTE[seed % PALETTE.length];
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-sanctum-raised font-bold ${dim} ${palette.bg} ${palette.text}`}
      aria-hidden
    >
      {initialsFromName(name || username || "?")}
    </span>
  );
}
