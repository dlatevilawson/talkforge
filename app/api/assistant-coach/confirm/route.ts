/**
 * POST /api/assistant-coach/confirm
 */
import { requireApiUser } from "@/lib/auth/api-guard";
import { handleAssistantCoachConfirmRequest } from "@/lib/assistant-coach/http-confirm";
import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";
import {
  livingProfileToRow,
  mapLivingProfileRow,
  type LivingProfileRow,
} from "@/lib/system1/persistence";
import type { LivingProfile } from "@/lib/system1/types";

export const runtime = "nodejs";

const deps = {
  async resolveAuthUserId() {
    const gate = await requireApiUser();
    return gate.ok ? gate.userId : null;
  },
  async loadProfile(userId: string) {
    if (!adminConfigured()) return null;
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("living_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return mapLivingProfileRow(data as LivingProfileRow);
  },
  async saveConfirmedProfile(profile: LivingProfile) {
    const admin = createAdminSupabaseClient();
    const row = livingProfileToRow({
      ...profile,
      version: Math.max(1, (profile.version ?? 0) + 1),
    });
    const { data, error } = await admin
      .from("living_profiles")
      .update({
        version: row.version,
        display_name: row.display_name,
        preferred_nickname: row.preferred_nickname,
        purpose_statement: row.purpose_statement,
        personal_principles: row.personal_principles,
        seasons: row.seasons,
        coaching_intensity: row.coaching_intensity,
        preferred_coaching_style: row.preferred_coaching_style,
        mattering_conversation_ids: row.mattering_conversation_ids,
        provenance: row.provenance,
        evidence_ledger: row.evidence_ledger,
        profile_insights: row.profile_insights,
        goals: row.goals,
        strengths: row.strengths,
        challenges: row.challenges,
        updated_at: row.updated_at,
      })
      .eq("user_id", profile.userId)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Living Profile save failed.");
    }
    return mapLivingProfileRow(data as LivingProfileRow);
  },
};

export async function POST(request: Request) {
  return handleAssistantCoachConfirmRequest(request, deps);
}
