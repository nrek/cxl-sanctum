"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";
import { isLoggedIn } from "@/lib/api";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isPublic = isPublicRoute(pathname);

    if (isPublic) {
      if (pathname === "/" && isLoggedIn()) {
        router.replace("/dashboard");
      }
      setChecked(true);
      return;
    }

    if (!isLoggedIn()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked && !isPublicRoute(pathname)) return null;
  return <>{children}</>;
}
