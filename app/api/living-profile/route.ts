import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { emptyLivingProfile } from "@/lib/system1/profile";
import { applyMemberLivingProfileUpdate } from "@/lib/system1/member-writes";
import {
  backfillLivingProfileFromCoachMemory,
  livingProfileNeedsBackfill,
} from "@/lib/system1/migrate-from-coach-memory";
import type { LivingProfile } from "@/lib/system1/types";
import type { CoachMemory } from "@/lib/coach/types";

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

function mapCoachMemoryLite(row: Record<string, unknown>): CoachMemory {
  return {
    userId: String(row.user_id),
    displayName: String(row.display_name ?? ""),
    preferredNickname: String(row.preferred_nickname ?? ""),
    occupation: String(row.occupation ?? ""),
    communicationGoals: Array.isArray(row.communication_goals)
      ? (row.communication_goals as string[])
      : [],
    longTermChallenges: Array.isArray(row.long_term_challenges)
      ? (row.long_term_challenges as string[])
      : [],
    biggestFears: [],
    recentWins: [],
    topicsWorkingOn: [],
    preferredCoachingStyle: String(row.preferred_coaching_style ?? ""),
    learningStyle: "",
    confidenceLevel: null,
    biggestStrength: "",
    speakingHabits: [],
    emotionalTriggers: Array.isArray(row.emotional_triggers)
      ? (row.emotional_triggers as string[])
      : [],
    favoriteScenarios: [],
    pastExercises: [],
    notes: {},
    lastSessionId: null,
    lastSessionSummary: "",
    lastScenarioTitle: "",
    lastSessionAt: null,
    sessionsCompleted: 0,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function upsertLivingProfile(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profile: LivingProfile
): Promise<{ ok: boolean; missingTable?: boolean }> {
  const payload = {
    user_id: profile.userId,
    display_name: profile.displayName,
    preferred_nickname: profile.preferredNickname,
    purpose_statement: profile.purposeStatement,
    personal_principles: profile.personalPrinciples,
    seasons: profile.seasons,
    coaching_intensity: profile.coachingIntensity,
    preferred_coaching_style: profile.preferredCoachingStyle,
    mattering_conversation_ids: profile.matteringConversationIds,
    provenance: profile.provenance,
    updated_at: profile.updatedAt,
  };

  const { error } = await supabase.from("living_profiles").upsert(payload);
  if (error) {
    if (
      error.message.includes("living_profiles") ||
      error.code === "PGRST205"
    ) {
      return { ok: false, missingTable: true };
    }
    throw new Error(error.message);
  }
  return { ok: true };
}

/**
 * Read Living Profile (SSOT). Backfills from coach_memory declared fields
 * when LP is empty — does not copy session-inferred identity.
 */
export async function GET() {
  try {
    if (!getSupabaseConfigStatus().configured) {
      return NextResponse.json({ profile: null, tableReady: false });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null, tableReady: true });
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
          tableReady: false,
        });
      }
      console.warn("[living-profile] query failed", error.message);
      return NextResponse.json({
        profile: emptyLivingProfile(user.id, displayName),
        tableReady: true,
      });
    }

    let profile = data
      ? mapLivingProfile(data)
      : emptyLivingProfile(user.id, displayName);

    if (livingProfileNeedsBackfill(profile)) {
      const { data: memoryRow } = await supabase
        .from("coach_memory")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const memory = memoryRow
        ? mapCoachMemoryLite(memoryRow as Record<string, unknown>)
        : null;
      const backfilled = backfillLivingProfileFromCoachMemory(
        user.id,
        memory,
        profile
      );
      if (!livingProfileNeedsBackfill(backfilled)) {
        const saved = await upsertLivingProfile(supabase, backfilled);
        if (saved.ok) profile = backfilled;
        else if (saved.missingTable) {
          return NextResponse.json({
            profile: backfilled,
            tableReady: false,
          });
        }
      }
    }

    return NextResponse.json({ profile, tableReady: true });
  } catch (err) {
    console.warn("[living-profile] GET failed", err);
    return NextResponse.json({ profile: null, tableReady: false });
  }
}

/**
 * Member write to Living Profile only (Forge Law #015 / #016).
 * Body: MemberLivingProfileInput fields.
 */
export async function PUT(req: Request) {
  try {
    if (!getSupabaseConfigStatus().configured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      displayName?: string;
      preferredNickname?: string;
      purposeStatement?: string;
      principleLines?: string[];
      seasonLabels?: string[];
      preferredCoachingStyle?: string;
      coachingIntensity?: LivingProfile["coachingIntensity"];
    };

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
        return NextResponse.json(
          {
            error:
              "living_profiles table not migrated yet. Apply supabase/migrations/20260802_living_profiles.sql",
            tableReady: false,
          },
          { status: 503 }
        );
      }
      throw new Error(error.message);
    }

    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : "";
    const current = data
      ? mapLivingProfile(data)
      : emptyLivingProfile(user.id, displayName);

    const next = applyMemberLivingProfileUpdate(current, body);
    const saved = await upsertLivingProfile(supabase, next);
    if (!saved.ok) {
      return NextResponse.json(
        {
          error:
            "living_profiles table not migrated yet. Apply supabase/migrations/20260802_living_profiles.sql",
          tableReady: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ profile: next, tableReady: true });
  } catch (err) {
    console.warn("[living-profile] PUT failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}
