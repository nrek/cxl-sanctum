"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";
import { useSidebar } from "@/contexts/SidebarContext";

export default function MainShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const fullBleed = isPublicRoute(pathname);

  return (
    <main
      className={
        fullBleed
          ? "min-h-screen"
          : `min-h-screen pb-20 transition-[margin] duration-200 md:pb-0 ${
              collapsed ? "md:ml-16" : "md:ml-60"
            }`
      }
    >
      {children}
    </main>
  );
}
