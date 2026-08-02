import { Suspense } from "react";
import ChangePasswordForm from "@/app/components/auth/ChangePasswordForm";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/")
      ? params.next
      : "/app";

  return (
    <Suspense>
      <ChangePasswordForm next={next} />
    </Suspense>
  );
}
