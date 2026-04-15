"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";

/** Full-width on marketing/auth pages; offset for sidebar in the app shell. */
export default function MainShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullBleed = isPublicRoute(pathname);

  return (
    <main className={fullBleed ? "min-h-screen" : "ml-60 min-h-screen"}>
      {children}
    </main>
  );
}
