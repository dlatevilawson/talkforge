import OnboardingForm from "@/app/components/auth/OnboardingForm";
import { requireAuth } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const session = await requireAuth("/onboarding");
  return (
    <OnboardingForm displayName={session.displayName || ""} />
  );
}
