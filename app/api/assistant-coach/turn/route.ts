/**
 * Phase 4B.4 — Assistant Coach turn API.
 * POST /api/assistant-coach/turn
 */
import { requireApiUser } from "@/lib/auth/api-guard";
import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { handleAssistantCoachTurnRequest } from "@/lib/assistant-coach/http-turn";
import { createOpenAiAssistantCoachModel } from "@/lib/assistant-coach/openai-model";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";
import {
  mapLivingProfileRow,
  type LivingProfileRow,
} from "@/lib/system1/persistence";

export const runtime = "nodejs";

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
  createModel: () => createOpenAiAssistantCoachModel(),
  async resolveAuthUserId() {
    const gate = await requireApiUser();
    return gate.ok ? gate.userId : null;
  },
  async loadMemberProfile(userId: string) {
    try {
      if (!adminConfigured()) return null;
      const admin = createAdminSupabaseClient();
      const { data, error } = await admin
        .from("living_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return null;
      return mapLivingProfileRow(data as LivingProfileRow);
    } catch {
      return null;
    }
  },
};

export async function POST(request: Request) {
  return handleAssistantCoachTurnRequest(request, deps);
}
