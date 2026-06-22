"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";
import { useSidebar } from "@/contexts/SidebarContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isAdminRole, workspaceRole } from "@/lib/roles";

export default function MainShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const { workspace } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const fullBleed = isPublicRoute(pathname);
  const initials = workspace?.name?.slice(0, 2).toUpperCase() || "SX";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <main
      className={
        fullBleed
          ? "min-h-screen"
          : `min-h-screen pb-20 transition-[margin] duration-200 md:pb-0 ${
              collapsed ? "md:ml-16" : "md:ml-[248px]"
            }`
      }
    >
      {!fullBleed ? (
        <div className="fixed right-4 top-4 z-50">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sanctum-line bg-sanctum-raised font-mono text-xs font-bold text-sanctum-mist shadow-lg hover:border-sanctum-accent"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {initials}
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-[13px] border border-sanctum-line bg-sanctum-surface shadow-2xl">
                <div className="border-b border-sanctum-line p-4">
                  <div className="font-display text-sm font-bold text-sanctum-mist">
                    {workspace?.name || "Sanctum"}
                  </div>
                  <div className="font-mono text-[11px] text-sanctum-muted">
                    {workspaceRole(workspace)}
                  </div>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-sanctum-sm px-3 py-2.5 text-sm text-sanctum-mist hover:bg-white/5"
                  >
                    <span className="w-4 text-center font-mono text-sanctum-muted">
                      ⊹
                    </span>
                    My profile
                  </Link>
                  {isAdminRole(workspace) ? (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 rounded-sanctum-sm px-3 py-2.5 text-sm text-sanctum-mist hover:bg-white/5"
                    >
                      <span className="w-4 text-center font-mono text-sanctum-muted">
                        ⚙
                      </span>
                      Manage Sanctum
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-sanctum-sm px-3 py-2.5 text-left text-sm text-sanctum-mist hover:bg-white/5"
                  >
                    <i
                      className="fa-solid fa-right-from-bracket w-4 text-center text-sanctum-muted"
                      aria-hidden
                    />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {children}
    </main>
  );
}
