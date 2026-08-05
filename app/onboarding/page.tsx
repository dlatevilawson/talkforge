import DiscoverGym from "@/app/components/discover/DiscoverGym";
import { requireAuth } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const session = await requireAuth("/onboarding");
  return <DiscoverGym displayName={session.displayName || ""} />;
}
