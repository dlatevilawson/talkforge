import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { handleAssistantCoachProfileRequest } from "@/lib/assistant-coach/http-profile";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
};

export async function POST(request: Request) {
  return handleAssistantCoachProfileRequest(request, deps);
}
