"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { logout } from "@/lib/api";
import { isPublicRoute } from "@/lib/routes";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/contexts/SidebarContext";
import Tooltip from "@/components/Tooltip";
import { canViewBilling, isAdminRole } from "@/lib/roles";

const BASE_NAV: { href: string; label: string; glyph: string }[] = [
  { href: "/dashboard", label: "Dashboard", glyph: "▦" },
  { href: "/projects", label: "Projects", glyph: "◆" },
];

const ADMIN_NAV: { href: string; label: string; glyph: string }[] = [
  { href: "/teams", label: "Teams", glyph: "⦿" },
  { href: "/members", label: "Members", glyph: "⊹" },
  { href: "/keys", label: "SSH Keys", glyph: "⚷" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const { collapsed, toggle } = useSidebar();

  if (isPublicRoute(pathname)) return null;

  const isAdmin = isAdminRole(workspace);
  const showPlanCard = canViewBilling(workspace);
  const pendingRequests = workspace?.pending_access_requests ?? 0;
  const nav = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  const navClass = (active: boolean) =>
    active ? "nav-item nav-item-active" : "nav-item hover:bg-white/5 hover:text-sanctum-mist";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sanctum-line bg-sanctum-surface transition-[width] duration-200 md:flex ${
        collapsed ? "w-16" : "w-[248px]"
      }`}
    >
      <div className="border-b border-sanctum-line px-4 py-5">
        {collapsed ? (
          <Link href="/dashboard" className="flex justify-center">
            <BrandMark size="sm" showWordmark={false} />
          </Link>
        ) : (
          <BrandMark
            href="/dashboard"
            size="sm"
            subtitle={workspace?.name}
          />
        )}
      </div>

      <nav
        className={`flex-1 space-y-0.5 px-3 py-3 ${
          collapsed ? "overflow-visible" : "overflow-y-auto"
        }`}
      >
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return collapsed ? (
            <Tooltip key={item.href} label={item.label} side="right">
              <Link
                href={item.href}
                className={`flex justify-center rounded-sanctum-sm p-2.5 font-mono text-sm ${navClass(active)}`}
              >
                {item.glyph}
              </Link>
            </Tooltip>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={navClass(active)}
            >
              <span className="w-[18px] text-center font-mono text-[13px]">
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <>
            <div className="mx-2 my-2 border-t border-sanctum-line" />
            {collapsed ? (
              <Tooltip label="Requests" side="right">
                <Link
                  href="/requests"
                  className={`relative flex justify-center rounded-sanctum-sm p-2.5 font-mono text-sm ${navClass(pathname.startsWith("/requests"))}`}
                >
                  ⊶
                  {pendingRequests > 0 ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sanctum-accent" />
                  ) : null}
                </Link>
              </Tooltip>
            ) : (
              <Link
                href="/requests"
                className={navClass(pathname.startsWith("/requests"))}
              >
                <span className="w-[18px] text-center font-mono text-[13px]">
                  ⊶
                </span>
                Requests
                {pendingRequests > 0 ? (
                  <span className="ml-auto rounded-full bg-sanctum-accent px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {pendingRequests}
                  </span>
                ) : null}
              </Link>
            )}
          </>
        ) : null}
      </nav>

      {!collapsed && showPlanCard && workspace ? (
        <div className="mx-3 mb-2 rounded-[11px] border border-sanctum-line bg-sanctum-raised p-3.5">
          <div className="mb-1 text-xs font-semibold text-sanctum-mist">
            Plan
          </div>
          <div className="font-mono text-xs text-sanctum-muted">
            {workspace.environment_limit != null
              ? `${workspace.environment_count} / ${workspace.environment_limit}`
              : `${workspace.environment_count} (unlimited)`}
          </div>
          <Link
            href="/dashboard"
            className="mt-2 block text-xs font-semibold text-sanctum-accent hover:text-sanctum-mist"
          >
            Billing &amp; usage{workspace.can_manage_billing ? " →" : ""}
          </Link>
        </div>
      ) : null}

      <div className="border-t border-sanctum-line p-2">
        {collapsed ? (
          <Tooltip label="Sign out" side="right">
            <button
              type="button"
              onClick={logout}
              className="flex w-full justify-center rounded-sanctum-sm p-2.5 text-sanctum-muted hover:bg-white/5 hover:text-sanctum-mist"
            >
              <i className="fa-solid fa-right-from-bracket" aria-hidden />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="nav-item w-full text-left"
          >
            <i className="fa-solid fa-right-from-bracket w-[18px] text-center" aria-hidden />
            Sign out
          </button>
        )}
      </div>

      <div className="border-t border-sanctum-line p-2">
        <Tooltip
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
        >
          <button
            type="button"
            onClick={toggle}
            className="flex w-full justify-center rounded-sanctum-sm p-2 text-sanctum-muted hover:bg-white/5 hover:text-sanctum-mist"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i
              className={`fa-solid ${collapsed ? "fa-angles-right" : "fa-angles-left"} text-xs`}
              aria-hidden
            />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
