import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Compatibility alias — production auth is a single system at `/login`.
 * Founder Portal access is role-gated after the same email/password session.
 * Dev-only Founder bootstrap (`FOUNDER_DEV_*`) never runs in production.
 */
export default async function FounderLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const requested = safeNextPath(params.next, "/founder");
  const next = requested.startsWith("/founder") ? requested : "/founder";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
