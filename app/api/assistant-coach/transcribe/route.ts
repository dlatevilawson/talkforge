/**
 * Public Coach speech-to-text.
 * POST multipart/form-data field `audio` → { text }
 * Requires valid tf_ac_anon cookie. Server-only OPENAI_API_KEY.
 */
import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { handleAssistantCoachTranscribeRequest } from "@/lib/assistant-coach/http-transcribe";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
};

export async function POST(request: Request) {
  return handleAssistantCoachTranscribeRequest(request, deps);
}
