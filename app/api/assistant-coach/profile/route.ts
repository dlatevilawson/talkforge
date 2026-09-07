import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { handleAssistantCoachProfileRequest } from "@/lib/assistant-coach/http-profile";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { adminConfigured } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activateAssistantCoachProfile } from "@/lib/assistant-coach/activation";
import { createActivationLivingProfileStore } from "@/lib/assistant-coach/activation-server";

export const runtime = "nodejs";

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
  async resolveAuthUserId() {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  },
  async activateAuthenticated(input: {
    anonKeyHash: string;
    userId: string;
  }) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== input.userId) {
      throw new Error("Authenticated member changed.");
    }
    return activateAssistantCoachProfile({
      repository: createSupabaseAssistantCoachSessionRepository(),
      profiles: createActivationLivingProfileStore(supabase, user),
      anonKeyHash: input.anonKeyHash,
      userId: user.id,
    });
  },
};

export async function POST(request: Request) {
  return handleAssistantCoachProfileRequest(request, deps);
}
