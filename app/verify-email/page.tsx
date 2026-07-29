import VerifyEmailPanel from "@/app/components/auth/VerifyEmailPanel";
import { readSession } from "@/lib/auth/session";

export default async function VerifyEmailPage() {
  const session = await readSession();
  return <VerifyEmailPanel email={session.email} />;
}
