import { Suspense } from "react";
import SignupForm from "@/app/components/auth/SignupForm";
import { safeNextPath } from "@/lib/auth/safe-next";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/app");

  return (
    <Suspense>
      <SignupForm next={next} />
    </Suspense>
  );
}
