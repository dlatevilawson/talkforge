import { Suspense } from "react";
import LoginForm from "@/app/components/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Founder Portal login entry.
 * Uses the same Supabase Auth identity as member login; after success,
 * authorized founders are sent to Headquarters (`/founder`).
 */
export default async function FounderLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const requested = safeNextPath(params.next, "/founder");
  const next = requested.startsWith("/founder") ? requested : "/founder";

  const notice =
    params.notice === "verified"
      ? "Email verified. You can sign in to the Founder Portal."
      : params.error === "auth_callback"
        ? "That verification link is invalid or expired. Sign in or request a new email."
        : params.error === "auth_unavailable"
          ? "Authentication is temporarily unavailable."
          : params.error === "forbidden"
            ? "That account does not have Founder Portal access."
            : undefined;

  return (
    <Suspense>
      <LoginForm next={next} notice={notice} variant="founder" />
    </Suspense>
  );
}
