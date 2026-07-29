import { Suspense } from "react";
import SignupForm from "@/app/components/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/")
      ? params.next
      : "/app/dashboard";

  return (
    <Suspense>
      <SignupForm next={next} />
    </Suspense>
  );
}
