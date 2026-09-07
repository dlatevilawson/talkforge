/**
 * Phase 4B.13 — public vs protected route classification for Assistant Coach.
 * Used by proxy.ts so /coach stays pre-auth while Forge stays behind /app.
 */

/** Public Assistant Coach surfaces (anon OK). */
export const ASSISTANT_COACH_PUBLIC_PATH_PREFIXES = [
  "/api/assistant-coach/session",
  "/api/assistant-coach/profile",
] as const;

export const ASSISTANT_COACH_PUBLIC_PAGE_PATHS = ["/coach"] as const;

/** Existing member/staff surfaces that require auth at the proxy. */
export const PROXY_AUTH_REQUIRED_PREFIXES = [
  "/founder",
  "/app",
  "/coach/activate",
  "/onboarding",
  "/change-password",
] as const;

export function isAssistantCoachPublicPath(pathname: string): boolean {
  if (
    ASSISTANT_COACH_PUBLIC_PAGE_PATHS.some((path) => pathname === path)
  ) {
    return true;
  }
  return ASSISTANT_COACH_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Whether the Next.js proxy should require a Supabase session for this path.
 * Public AC routes must remain false even if they look “app-like”.
 */
export function proxyRequiresAuth(pathname: string): boolean {
  if (isAssistantCoachPublicPath(pathname)) return false;
  return PROXY_AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Decision 060 continuity-only soft verification.
 *
 * These destinations still require an authenticated Supabase session. This
 * only defers the verified-email redirect long enough to activate the signed
 * wizard draft and begin its server-authoritative Forge handoff.
 */
export function allowsUnverifiedCoachContinuity(
  pathname: string,
  searchParams: Pick<URLSearchParams, "getAll">
): boolean {
  if (pathname === "/coach/activate") return true;
  if (pathname !== "/app/practice") return false;
  const sources = searchParams.getAll("source");
  return sources.length === 1 && sources[0] === "coach_wizard";
}

export function allowsUnverifiedCoachContinuityUrl(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://") ||
    value.includes("\\")
  ) {
    return false;
  }
  const url = new URL(value, "https://talkforge.local");
  if (url.hash) return false;
  return allowsUnverifiedCoachContinuity(url.pathname, url.searchParams);
}

/** Authentication remains mandatory for every protected continuity route. */
export function unauthenticatedAuthDestination(
  pathname: string
): "/login" | "/signup" {
  return pathname.startsWith("/founder") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/onboarding")
    ? "/login"
    : "/signup";
}
