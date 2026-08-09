/**
 * Ensure a persisted Living Profile row exists for an authenticated member.
 *
 * The GET API previously returned an in-memory emptyLivingProfile(displayName)
 * without inserting. ContinuityHome treated that as ready while the practice
 * route gate loaded living_profiles and redirected — Begin looked live, Forge
 * never opened.
 *
 * Bootstrapping from account display name is identity-plane (member/account),
 * not an experience write.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { mapLivingProfileRow, type LivingProfileRow } from "./persistence";
import type { LivingProfile, ProvenanceRecord } from "./types";

const LP_SELECT =
  "user_id, version, display_name, preferred_nickname, purpose_statement, personal_principles, seasons, coaching_intensity, preferred_coaching_style, mattering_conversation_ids, provenance, presence_scores, goals, strengths, challenges, profile_source, updated_at";

export type EnsureLivingProfileResult = {
  profile: LivingProfile | null;
  tableReady: boolean;
  created: boolean;
};

function resolveDisplayName(
  user: User,
  profileDisplayName: string | null | undefined
): string {
  const fromProfile = profileDisplayName?.trim() ?? "";
  if (fromProfile) return fromProfile;

  const meta = user.user_metadata?.display_name;
  if (typeof meta === "string" && meta.trim()) return meta.trim();

  const emailLocal = user.email?.split("@")[0]?.trim() ?? "";
  if (emailLocal) return emailLocal;

  return "Member";
}

function bootstrapProvenance(displayName: string, now: string): ProvenanceRecord[] {
  return [
    {
      id: `prov_account_bootstrap_${now}`,
      fieldPath: "displayName",
      claim: displayName,
      sourceKind: "member_declared",
      evidenceRefs: ["account_profile"],
      confidence: "high",
      createdAt: now,
      updatedAt: now,
      memberConfirmed: true,
    },
  ];
}

function isMissingTableError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.message?.includes("living_profiles") ||
      error.code === "PGRST205" ||
      error.code === "42P01"
  );
}

/**
 * Load the member's Living Profile, inserting a minimal persisted row when absent.
 */
export async function ensurePersistedLivingProfile(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureLivingProfileResult> {
  const { data, error } = await supabase
    .from("living_profiles")
    .select(LP_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { profile: null, tableReady: false, created: false };
    }
    throw new Error(error.message);
  }

  if (data) {
    return {
      profile: mapLivingProfileRow(data as LivingProfileRow),
      tableReady: true,
      created: false,
    };
  }

  const { data: accountProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = resolveDisplayName(
    user,
    accountProfile?.display_name as string | null | undefined
  );
  const now = new Date().toISOString();
  const provenance = bootstrapProvenance(displayName, now);

  const { data: inserted, error: insertError } = await supabase
    .from("living_profiles")
    .insert({
      user_id: user.id,
      version: 1,
      display_name: displayName,
      preferred_nickname: "",
      purpose_statement: "",
      personal_principles: [],
      seasons: [],
      coaching_intensity: "steady",
      preferred_coaching_style: "",
      mattering_conversation_ids: [],
      provenance,
      updated_at: now,
    })
    .select(LP_SELECT)
    .single();

  if (insertError) {
    if (isMissingTableError(insertError)) {
      return { profile: null, tableReady: false, created: false };
    }
    // Concurrent bootstrap — load the winner.
    if (insertError.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("living_profiles")
        .select(LP_SELECT)
        .eq("user_id", user.id)
        .maybeSingle();
      if (raceError) throw new Error(raceError.message);
      return {
        profile: raced ? mapLivingProfileRow(raced as LivingProfileRow) : null,
        tableReady: true,
        created: false,
      };
    }
    throw new Error(insertError.message);
  }

  return {
    profile: mapLivingProfileRow(inserted as LivingProfileRow),
    tableReady: true,
    created: true,
  };
}
