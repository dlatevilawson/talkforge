import { Suspense } from "react";
import LoginForm from "@/app/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/")
      ? params.next
      : "/app/dashboard";
  const notice =
    params.notice === "verified"
      ? "Email verified. You can sign in now."
      : params.error === "auth_unavailable"
        ? undefined
        : undefined;

  return (
    <Suspense>
      <LoginForm
        next={next}
        notice={
          notice ||
          (params.error === "auth_unavailable"
            ? "Authentication is temporarily unavailable."
            : undefined)
        }
      />
    </Suspense>
  );
}
