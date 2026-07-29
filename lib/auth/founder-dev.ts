/**
 * Development-only Founder bootstrap.
 * Locked out when NODE_ENV or VERCEL_ENV is production.
 * Credentials come from environment variables — never commit secrets.
 */

export function founderDevAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.FOUNDER_DEV_ENABLED === "true";
}

export function founderDevEmail(): string {
  return (
    process.env.FOUNDER_DEV_EMAIL?.trim().toLowerCase() ||
    "founder@talkforge.io"
  );
}

/** Temporary password for local bootstrap only. Prefer env override. */
export function founderDevPassword(): string {
  return process.env.FOUNDER_DEV_PASSWORD ?? "";
}

export function founderDevConfigured(): boolean {
  return (
    founderDevAllowed() &&
    Boolean(founderDevEmail()) &&
    Boolean(founderDevPassword())
  );
}
