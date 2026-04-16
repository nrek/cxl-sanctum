const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
]);

/** Routes that do not require auth (marketing + auth flows). */
export function isPublicRoute(pathname: string): boolean {
  if (pathname.startsWith("/reset-password")) return true;
  return PUBLIC_PATHS.has(pathname);
}
