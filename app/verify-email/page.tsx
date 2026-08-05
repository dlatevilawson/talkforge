import VerifyEmailPanel from "@/app/components/auth/VerifyEmailPanel";

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
  const next =
    params.next && params.next.startsWith("/") ? params.next : "/onboarding";
  return <VerifyEmailPanel email={email} next={next} />;
}
