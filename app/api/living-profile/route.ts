import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { emptyLivingProfile } from "@/lib/system1/profile";
import { ensurePersistedLivingProfile } from "@/lib/system1/ensure-living-profile";
import { applyMemberLivingProfileUpdate } from "@/lib/system1/member-writes";
import { attachLegacyCoachMemoryEvidence } from "@/lib/system1/migrate-from-coach-memory";
import { mapLivingProfileRow } from "@/lib/system1/persistence";
import type { LivingProfile } from "@/lib/system1/types";
import type { CoachMemory } from "@/lib/coach/types";

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

type MemberSaveResult =
  | { status: "saved"; profile: LivingProfile }
  | { status: "conflict" }
  | { status: "missing_schema" };

async function saveMemberLivingProfile(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profile: LivingProfile,
  expectedVersion: number
): Promise<MemberSaveResult> {
  const payload = {
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

  const query =
    expectedVersion === 0
      ? supabase
          .from("living_profiles")
          .insert({
            user_id: profile.userId,
            version: 1,
            ...payload,
          })
          .select("*")
          .single()
      : supabase
          .from("living_profiles")
          .update({
            ...payload,
            version: expectedVersion + 1,
          })
          .eq("user_id", profile.userId)
          .eq("version", expectedVersion)
          .select("*")
          .maybeSingle();

  const { data, error } = await query;
  if (error) {
    if (
      error.message.includes("living_profiles") ||
      error.message.includes("version") ||
      error.code === "PGRST204" ||
      error.code === "PGRST205" ||
      error.code === "42703"
    ) {
      return { status: "missing_schema" };
    }
    if (error.code === "23505") {
      return { status: "conflict" };
    }
    throw new Error(error.message);
  }

  if (!data) return { status: "conflict" };
  return { status: "saved", profile: mapLivingProfileRow(data) };
}

async function saveLegacyEvidence(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profile: LivingProfile
): Promise<MemberSaveResult> {
  const query =
    profile.version === 0
      ? supabase
          .from("living_profiles")
          .insert({
            user_id: profile.userId,
            version: 1,
            display_name: profile.displayName,
            provenance: profile.provenance,
            updated_at: profile.updatedAt,
          })
          .select("*")
          .single()
      : supabase
          .from("living_profiles")
          .update({
            version: profile.version + 1,
            provenance: profile.provenance,
            updated_at: profile.updatedAt,
          })
          .eq("user_id", profile.userId)
          .eq("version", profile.version)
          .select("*")
          .maybeSingle();

  const { data, error } = await query;
  if (error) {
    if (
      error.message.includes("living_profiles") ||
      error.message.includes("version") ||
      error.code === "PGRST204" ||
      error.code === "PGRST205" ||
      error.code === "42703"
    ) {
      return { status: "missing_schema" };
    }
    if (error.code === "23505") {
      return { status: "conflict" };
    }
    throw new Error(error.message);
  }

  if (!data) return { status: "conflict" };
  return { status: "saved", profile: mapLivingProfileRow(data) };
}

/** Read Living Profile (SSOT). GET is strictly read-only. */
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

    try {
      const ensured = await ensurePersistedLivingProfile(supabase, user);
      if (!ensured.tableReady) {
        const displayName =
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name
            : "";
        return NextResponse.json({
          profile: emptyLivingProfile(user.id, displayName),
          tableReady: false,
        });
      }
      return NextResponse.json({
        profile: ensured.profile,
        tableReady: true,
        created: ensured.created,
      });
    } catch (error) {
      console.warn(
        "[living-profile] ensure failed",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json({ profile: null, tableReady: true });
    }
  } catch (err) {
    console.warn("[living-profile] GET failed", err);
    return NextResponse.json({ profile: null, tableReady: false });
  }
}

/**
 * Explicit one-time legacy migration. CoachMemory values become unconfirmed
 * imported provenance only; no legacy value is promoted into identity fields.
 */
export async function POST() {
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

    const [profileResult, memoryResult] = await Promise.all([
      supabase
        .from("living_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("coach_memory")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      if (
        profileResult.error.message.includes("living_profiles") ||
        profileResult.error.code === "PGRST205"
      ) {
        return NextResponse.json(
          { error: "Living Profile schema is unavailable." },
          { status: 503 }
        );
      }
      throw new Error(profileResult.error.message);
    }

    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : "";
    const current = profileResult.data
      ? mapLivingProfileRow(profileResult.data)
      : emptyLivingProfile(user.id, displayName);

    if (memoryResult.error) {
      if (
        memoryResult.error.message.includes("coach_memory") ||
        memoryResult.error.code === "PGRST205" ||
        memoryResult.error.code === "42P01"
      ) {
        return NextResponse.json({
          profile: current,
          migratedCount: 0,
          sourceAvailable: false,
        });
      }
      throw new Error(memoryResult.error.message);
    }

    const memory = memoryResult.data
      ? mapCoachMemoryLite(memoryResult.data as Record<string, unknown>)
      : null;
    const migration = attachLegacyCoachMemoryEvidence(current, memory);
    if (migration.importedCount === 0) {
      return NextResponse.json({
        profile: current,
        migratedCount: 0,
        sourceAvailable: true,
      });
    }

    const saved = await saveLegacyEvidence(supabase, migration.profile);
    if (saved.status === "missing_schema") {
      return NextResponse.json(
        { error: "Living Profile versioning schema is unavailable." },
        { status: 503 }
      );
    }
    if (saved.status === "conflict") {
      return NextResponse.json(
        {
          error:
            "Living Profile changed during legacy migration. Reload and retry.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      profile: saved.profile,
      migratedCount: migration.importedCount,
      sourceAvailable: true,
    });
  } catch (err) {
    console.warn("[living-profile] POST legacy migration failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Migration failed" },
      { status: 500 }
    );
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
      expectedVersion?: number;
    };

    if (
      !Number.isInteger(body.expectedVersion) ||
      (body.expectedVersion ?? -1) < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Living Profile version is required. Reload your profile and try again.",
        },
        { status: 428 }
      );
    }
    const expectedVersion = body.expectedVersion as number;

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
      ? mapLivingProfileRow(data)
      : emptyLivingProfile(user.id, displayName);

    if (current.version !== expectedVersion) {
      return NextResponse.json(
        {
          error:
            "Your Living Profile changed in another session. Reload before saving.",
          conflict: true,
          profile: current,
        },
        { status: 409 }
      );
    }

    const next = applyMemberLivingProfileUpdate(current, body);
    const saved = await saveMemberLivingProfile(
      supabase,
      next,
      expectedVersion
    );
    if (saved.status === "missing_schema") {
      return NextResponse.json(
        {
          error:
            "Living Profile versioning is not migrated yet. Apply supabase/migrations/20260803_living_profile_versioning.sql",
          tableReady: false,
        },
        { status: 503 }
      );
    }
    if (saved.status === "conflict") {
      return NextResponse.json(
        {
          error:
            "Your Living Profile changed while saving. Reload before trying again.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ profile: saved.profile, tableReady: true });
  } catch (err) {
    console.warn("[living-profile] PUT failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}
