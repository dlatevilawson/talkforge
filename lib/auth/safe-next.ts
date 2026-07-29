/**
 * Prevent open redirects. Only allow same-app relative paths.
 * Rejects protocol-relative URLs (`//evil.com`) and absolute URLs.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/app/dashboard"
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
