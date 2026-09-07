import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { requireApiUser } from "@/lib/auth/api-guard";
import { handleGuestPreviewClaimRequest } from "@/lib/forge/preview-claim-http";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleGuestPreviewClaimRequest(request, {
    adminConfigured,
    requireCookieSecret: requireAssistantCoachAnonCookieSecret,
    createRepository: createSupabaseAssistantCoachSessionRepository,
    async resolveAuthUserId() {
      const gate = await requireApiUser();
      return gate.ok ? gate.userId : null;
    },
  });
}
