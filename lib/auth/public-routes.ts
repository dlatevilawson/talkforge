/**
 * Phase 4B.13 — public vs protected route classification for Assistant Coach.
 * Used by proxy.ts so /coach stays pre-auth while Forge stays behind /app.
 */

/** Public Assistant Coach surfaces (anon OK). */
export const ASSISTANT_COACH_PUBLIC_PATH_PREFIXES = [
  "/coach",
  "/api/assistant-coach/session",
  "/api/assistant-coach/turn",
  "/api/assistant-coach/transcribe",
] as const;

/** Auth-required AC surfaces (claim / confirm). */
export const ASSISTANT_COACH_AUTH_PATH_PREFIXES = [
  "/api/assistant-coach/claim",
  "/api/assistant-coach/confirm",
] as const;

/** Decision 060 guest Forge surface. Exact matches only. */
export const GUEST_FORGE_PUBLIC_PATHS = [
  "/forge",
  "/api/forge/preview",
  "/api/forge/preview/transcript",
  "/api/forge/preview/complete",
] as const;

/** Existing member/staff surfaces that require auth at the proxy. */
export const PROXY_AUTH_REQUIRED_PREFIXES = [
  "/founder",
  "/app",
  "/onboarding",
  "/change-password",
] as const;

export function isAssistantCoachPublicPath(pathname: string): boolean {
  return ASSISTANT_COACH_PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAssistantCoachAuthPath(pathname: string): boolean {
  return ASSISTANT_COACH_AUTH_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isGuestForgePublicPath(pathname: string): boolean {
  return (GUEST_FORGE_PUBLIC_PATHS as readonly string[]).includes(pathname);
}

/**
 * Whether the Next.js proxy should require a Supabase session for this path.
 * Public AC routes must remain false even if they look “app-like”.
 */
export function proxyRequiresAuth(pathname: string): boolean {
  if (isGuestForgePublicPath(pathname)) return false;
  if (isAssistantCoachPublicPath(pathname)) return false;
  // Claim is enforced in the API via requireApiUser; proxy may still allow
  // the request through so the route can return 401 JSON (not HTML redirect).
  if (isAssistantCoachAuthPath(pathname)) return false;
  return PROXY_AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
