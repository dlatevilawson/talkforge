/**
 * POST /api/assistant-coach/claim
 */
import { requireApiUser } from "@/lib/auth/api-guard";
import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { handleAssistantCoachClaimRequest } from "@/lib/assistant-coach/http-claim";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";
import { ensurePersistedLivingProfile } from "@/lib/system1/ensure-living-profile";
import {
  livingProfileToRow,
  mapLivingProfileRow,
  type LivingProfileRow,
} from "@/lib/system1/persistence";
import type { LivingProfile } from "@/lib/system1/types";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

function stubUser(userId: string): User {
  return {
    id: userId,
    email: "",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

function createProfileStore(userId: string) {
  const admin = createAdminSupabaseClient();
  return {
    async loadOrCreate() {
      const ensured = await ensurePersistedLivingProfile(admin, stubUser(userId));
      if (!ensured.tableReady || !ensured.profile) {
        throw new Error("Living Profile is not available.");
      }
      return ensured.profile;
    },
    async saveMerged(profile: LivingProfile) {
      const row = livingProfileToRow({
        ...profile,
        userId,
        version: Math.max(1, (profile.version ?? 0) + 1),
        updatedAt: new Date().toISOString(),
      });
      const { data, error } = await admin
        .from("living_profiles")
        .upsert(
          {
            user_id: userId,
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
            presence_scores: row.presence_scores,
            goals: row.goals,
            strengths: row.strengths,
            challenges: row.challenges,
            profile_source: row.profile_source,
            updated_at: row.updated_at,
          },
          { onConflict: "user_id" }
        )
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? "Living Profile save failed.");
      }
      return mapLivingProfileRow(data as LivingProfileRow);
    },
    async markOnboardingComplete() {
      await admin
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", userId);
    },
  };
}

const deps = {
  adminConfigured,
  requireCookieSecret: requireAssistantCoachAnonCookieSecret,
  createRepository: () => createSupabaseAssistantCoachSessionRepository(),
  async resolveAuthUserId() {
    const gate = await requireApiUser();
    return gate.ok ? gate.userId : null;
  },
  createProfileStore,
};

export async function POST(request: Request) {
  return handleAssistantCoachClaimRequest(request, deps);
}
