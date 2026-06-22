"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole, isOwnerRole } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: string };

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "fa-solid fa-gauge-simple-high" },
  { href: "/projects", label: "Projects", icon: "fa-solid fa-diagram-project" },
  { href: "/teams", label: "Teams", icon: "fa-solid fa-users-between-lines" },
  { href: "/members", label: "Members", icon: "fa-solid fa-user" },
];

const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "fa-solid fa-gauge-simple-high" },
  { href: "/projects", label: "Projects", icon: "fa-solid fa-diagram-project" },
  { href: "/profile", label: "Profile", icon: "fa-solid fa-user" },
];

/**
 * Fixed bottom tab bar for phones (Instagram-style). Hidden at md+.
 * The 5th slot is a "More" button that opens a bottom sheet containing
 * owner-only Admins plus Sign out.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  if (isPublicRoute(pathname)) return null;

  const isAdmin = isAdminRole(workspace);
  const isOwner = isOwnerRole(workspace);
  const navItems = isAdmin ? PRIMARY_NAV : MEMBER_NAV;
  const moreActive =
    pathname.startsWith("/requests") ||
    pathname.startsWith("/keys") ||
    pathname.startsWith("/profile") ||
    (isOwner && pathname.startsWith("/admins"));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sanctum-line bg-sanctum-surface/95 backdrop-blur supports-[backdrop-filter]:bg-sanctum-surface/80 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-colors ${
                active
                  ? "text-sanctum-mist"
                  : "text-sanctum-muted hover:text-sanctum-mist"
              }`}
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
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-colors ${
              moreOpen || moreActive
                ? "text-sanctum-mist"
                : "text-sanctum-muted hover:text-sanctum-mist"
            }`}
          >
            <i
              className={`fa-solid fa-ellipsis text-base ${
                moreOpen || moreActive ? "text-sanctum-accent" : ""
              }`}
              aria-hidden
            />
            <span className="leading-none">More</span>
          </button>
        ) : null}
      </nav>

      {moreOpen && isAdmin ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-sanctum-line/20 bg-sanctum-surface shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-sanctum-line/40" aria-hidden />
            <div className="px-2 pt-2 pb-3">
              {isOwner ? (
                <Link
                  href="/admins"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-sanctum-mist transition-colors hover:bg-white/5"
                >
                  <i
                    className="fa-solid fa-user-shield w-5 text-center text-sanctum-accent"
                    aria-hidden
                  />
                  Admins
                </Link>
              ) : null}
              <Link
                href="/requests"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-sanctum-mist transition-colors hover:bg-white/5"
              >
                <i
                  className="fa-solid fa-inbox w-5 text-center text-sanctum-accent"
                  aria-hidden
                />
                Requests
              </Link>
              <Link
                href="/keys"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-sanctum-mist transition-colors hover:bg-white/5"
              >
                <i
                  className="fa-solid fa-key w-5 text-center text-sanctum-accent"
                  aria-hidden
                />
                SSH Keys
              </Link>
              <Link
                href="/profile"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-sanctum-mist transition-colors hover:bg-white/5"
              >
                <i
                  className="fa-solid fa-user w-5 text-center text-sanctum-accent"
                  aria-hidden
                />
                My profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium text-sanctum-mist transition-colors hover:bg-white/5"
              >
                <i
                  className="fa-solid fa-right-from-bracket w-5 text-center text-sanctum-muted"
                  aria-hidden
                />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
