/** Decision 060 guest Forge surface. Exact matches only. */
export const GUEST_FORGE_PUBLIC_PATHS = [
  "/coach",
  "/forge",
  "/api/forge/preview",
  "/api/forge/preview/transcript",
  "/api/forge/preview/complete",
] as const;

/** Auth is resolved by the claim API so it can return JSON instead of HTML. */
export const FORGE_PREVIEW_CLAIM_PATH = "/api/forge/preview/claim";

/** Existing member/staff surfaces that require auth at the proxy. */
export const PROXY_AUTH_REQUIRED_PREFIXES = [
  "/founder",
  "/app",
  "/onboarding",
  "/change-password",
] as const;

export function isGuestForgePublicPath(pathname: string): boolean {
  return (GUEST_FORGE_PUBLIC_PATHS as readonly string[]).includes(pathname);
}

/**
 * Whether the Next.js proxy should require a Supabase session for this path.
 * Public AC routes must remain false even if they look “app-like”.
 */
export function proxyRequiresAuth(pathname: string): boolean {
  if (isGuestForgePublicPath(pathname)) return false;
  if (pathname === FORGE_PREVIEW_CLAIM_PATH) return false;
  return PROXY_AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
