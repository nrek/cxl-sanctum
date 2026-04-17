"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";

/** Minimal sticky header for phones: wordmark + sign-out. Hidden at md+. */
export default function MobileTopBar() {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sanctum-line/20 bg-[#182a35]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#182a35]/80 md:hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-logo text-base tracking-[0.2em] text-sanctum-mist"
      >
        SANCTUM
        <i className="fa-solid fa-key text-sanctum-accent text-xs" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        className="flex h-9 w-9 items-center justify-center rounded-md text-sanctum-muted transition-colors hover:bg-white/5 hover:text-sanctum-mist"
      >
        <i className="fa-solid fa-right-from-bracket" aria-hidden />
      </button>
    </header>
  );
}
