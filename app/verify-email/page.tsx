import VerifyEmailPanel from "@/app/components/auth/VerifyEmailPanel";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const params = await searchParams;
  const email =
    params.email && params.email.includes("@")
      ? params.email.trim().toLowerCase()
      : null;
  const next = safeAuthNextPath(params.next, "/onboarding");
  return <VerifyEmailPanel email={email} next={next} />;
}
