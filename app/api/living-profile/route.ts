import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emptyLivingProfile } from "@/lib/system1/profile";
import type { LivingProfile } from "@/lib/system1/types";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

function mapLivingProfile(row: {
  user_id: string;
  display_name?: string | null;
  preferred_nickname?: string | null;
  purpose_statement?: string | null;
  personal_principles?: LivingProfile["personalPrinciples"] | null;
  seasons?: LivingProfile["seasons"] | null;
  coaching_intensity?: LivingProfile["coachingIntensity"] | null;
  preferred_coaching_style?: string | null;
  mattering_conversation_ids?: string[] | null;
  provenance?: LivingProfile["provenance"] | null;
  updated_at?: string | null;
}): LivingProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? "",
    preferredNickname: row.preferred_nickname ?? "",
    purposeStatement: row.purpose_statement ?? "",
    personalPrinciples: row.personal_principles ?? [],
    seasons: row.seasons ?? [],
    coachingIntensity: row.coaching_intensity ?? "steady",
    preferredCoachingStyle: row.preferred_coaching_style ?? "",
    matteringConversationIds: row.mattering_conversation_ids ?? [],
    provenance: row.provenance ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Read Living Profile for Adaptive Homepage (server session).
 * Soft-returns empty profile when table missing or unauthenticated.
 */
export async function GET() {
  try {
    if (!getSupabaseConfigStatus().configured) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : "";

    const { data, error } = await supabase
      .from("living_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (
        error.message.includes("living_profiles") ||
        error.code === "PGRST205"
      ) {
        return NextResponse.json({
          profile: emptyLivingProfile(user.id, displayName),
        });
      }
      console.warn("[living-profile] query failed", error.message);
      return NextResponse.json({
        profile: emptyLivingProfile(user.id, displayName),
      });
    }

    const profile = data
      ? mapLivingProfile(data)
      : emptyLivingProfile(user.id, displayName);

    return NextResponse.json({ profile });
  } catch (err) {
    console.warn("[living-profile] GET failed", err);
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}
