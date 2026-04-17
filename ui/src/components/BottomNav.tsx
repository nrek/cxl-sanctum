"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type NavItem = { href: string; label: string; icon: string };

const BASE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "fa-solid fa-gauge-simple-high" },
  { href: "/projects", label: "Projects", icon: "fa-solid fa-diagram-project" },
  { href: "/teams", label: "Teams", icon: "fa-solid fa-users-between-lines" },
  { href: "/members", label: "Members", icon: "fa-solid fa-user" },
];

/** Fixed bottom tab bar for phones (Instagram-style). Hidden at md+. */
export default function BottomNav() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();

  if (isPublicRoute(pathname)) return null;

  const nav: NavItem[] =
    (workspace?.role ?? "owner") === "owner"
      ? [
          ...BASE_NAV,
          {
            href: "/admins",
            label: "Admins",
            icon: "fa-solid fa-user-shield",
          },
        ]
      : BASE_NAV;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sanctum-line/20 bg-[#182a35]/95 backdrop-blur supports-[backdrop-filter]:bg-[#182a35]/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-colors ${
              active
                ? "text-sanctum-mist"
                : "text-sanctum-muted hover:text-sanctum-mist"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <i
              className={`${item.icon} text-base ${
                active ? "text-sanctum-accent" : ""
              }`}
              aria-hidden
            />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
