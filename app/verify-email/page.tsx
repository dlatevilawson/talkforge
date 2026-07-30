import VerifyEmailPanel from "@/app/components/auth/VerifyEmailPanel";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email =
    params.email && params.email.includes("@")
      ? params.email.trim().toLowerCase()
      : null;
  return <VerifyEmailPanel email={email} />;
}
