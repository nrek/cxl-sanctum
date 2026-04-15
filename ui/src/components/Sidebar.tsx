"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";

const NAV: {
  href: string;
  label: string;
  icon: string;
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "fa-solid fa-gauge-simple-high",
  },
  { href: "/projects", label: "Projects", icon: "fa-solid fa-diagram-project" },
  { href: "/teams", label: "Teams", icon: "fa-solid fa-users-between-lines" },
  { href: "/members", label: "Members", icon: "fa-solid fa-user" },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-sanctum-line/20 bg-[#182a35]">
      <div className="flex h-16 items-center justify-center gap-2 border-b border-sanctum-line/15 px-4">
        <Link
          href="/dashboard"
          className="font-logo text-lg font-normal tracking-[0.2em] text-sanctum-mist hover:text-white"
        >
          SANCTUM
        </Link>
        <i className="fa-solid fa-key text-sanctum-accent text-sm" aria-hidden />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sanctum-accent/25 text-sanctum-mist shadow-inner"
                  : "text-sanctum-muted hover:bg-white/5 hover:text-sanctum-mist"
              }`}
            >
              <i className={`${item.icon} w-5 text-center text-[0.95rem]`} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sanctum-line/15 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sanctum-muted transition-colors hover:bg-white/5 hover:text-sanctum-mist"
        >
          <i className="fa-solid fa-right-from-bracket w-5 text-center" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
