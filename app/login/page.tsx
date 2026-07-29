import { Suspense } from "react";
import LoginForm from "@/app/components/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/safe-next";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/app/dashboard");
  const notice =
    params.notice === "verified"
      ? "Email verified. You can sign in now."
      : params.error === "auth_callback"
        ? "That verification link is invalid or expired. Sign in or request a new email."
        : params.error === "auth_unavailable"
          ? "Authentication is temporarily unavailable."
          : undefined;

  return (
    <Suspense>
      <LoginForm next={next} notice={notice} />
    </Suspense>
  );
}
