/**
 * Prevent open redirects. Only allow same-app relative paths.
 * Rejects protocol-relative URLs (`//evil.com`) and absolute URLs.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/app"
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  // Block path tricks that escape to other hosts in some browsers
  if (/[\x00-\x1f]/.test(value)) return fallback;
  return value.slice(0, 512) || fallback;
}

const AUTH_NEXT_EXACT_PATHS = new Set([
  "/app",
  "/onboarding",
  "/founder",
  "/change-password",
  "/reset-password",
  "/coach/activate",
  "/coach/confirm",
]);

/**
 * Auth return targets are narrower than general same-origin navigation.
 * In particular, Coach activation is accepted only as the exact governed
 * boundary; query/hash/path suffixes cannot smuggle a second destination.
 */
export function safeAuthNextPath(
  raw: string | null | undefined,
  fallback = "/app"
): string {
  const value = safeNextPath(raw, "");
  if (!value) return fallback;
  if (AUTH_NEXT_EXACT_PATHS.has(value)) return value;
  if (value.startsWith("/app/") || value.startsWith("/founder/")) return value;
  return fallback;
}
