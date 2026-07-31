import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildCoachPromptContext, emptyCoachMemory } from "@/lib/coach/memory";
import { buildPurposePromptHints } from "@/lib/coach/purpose";
import type {
  CoachMemory,
  CoachPromptContext,
  LearningStyle,
  LifeCommitment,
  LifeMilestone,
  SessionReport,
} from "@/lib/coach/types";

function asLearningStyle(value: unknown): LearningStyle {
  if (
    value === "practice_first" ||
    value === "reflect_first" ||
    value === "example_first" ||
    value === "challenge_first"
  ) {
    return value;
  }
  return "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function asMilestones(value: unknown): LifeMilestone[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, i) => ({
      id: typeof item.id === "string" ? item.id : `m_${i}`,
      label: String(item.label ?? ""),
      date: typeof item.date === "string" ? item.date : null,
      note: String(item.note ?? ""),
    }))
    .filter((m) => m.label.trim());
}

function asCommitments(value: unknown): LifeCommitment[] {
  if (!Array.isArray(value)) return [];
  const out: LifeCommitment[] = [];
  value.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const status: LifeCommitment["status"] =
      row.status === "done" || row.status === "skipped" || row.status === "open"
        ? row.status
        : "open";
    const source: LifeCommitment["source"] =
      row.source === "session" ? "session" : "user";
    const text = String(row.text ?? "").trim();
    if (!text) return;
    out.push({
      id: typeof row.id === "string" ? row.id : `c_${i}`,
      text,
      plannedFor: typeof row.plannedFor === "string" ? row.plannedFor : null,
      status,
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString(),
      followedUpAt:
        typeof row.followedUpAt === "string" ? row.followedUpAt : null,
      source,
    });
  });
  return out;
}

function mapMemory(row: Record<string, unknown>): CoachMemory {
  return {
    userId: String(row.user_id),
    displayName: String(row.display_name ?? ""),
    preferredNickname: String(row.preferred_nickname ?? ""),
    occupation: String(row.occupation ?? ""),
    communicationGoals: asStringArray(row.communication_goals),
    longTermChallenges: asStringArray(row.long_term_challenges),
    biggestFears: asStringArray(row.biggest_fears),
    recentWins: asStringArray(row.recent_wins),
    topicsWorkingOn: asStringArray(row.topics_working_on),
    preferredCoachingStyle: String(row.preferred_coaching_style ?? ""),
    learningStyle: asLearningStyle(row.learning_style),
    confidenceLevel:
      typeof row.confidence_level === "number" ? row.confidence_level : null,
    biggestStrength: String(row.biggest_strength ?? ""),
    speakingHabits: asStringArray(row.speaking_habits),
    emotionalTriggers: asStringArray(row.emotional_triggers),
    northStar: String(row.north_star ?? ""),
    lifeVision: String(row.life_vision ?? ""),
    personTheyWantToBecome: String(row.person_they_want_to_become ?? ""),
    compassRelationships: String(row.compass_relationships ?? ""),
    compassLearning: String(row.compass_learning ?? ""),
    compassHealth: String(row.compass_health ?? ""),
    careerGoals: asStringArray(row.career_goals),
    familyGoals: asStringArray(row.family_goals),
    healthGoals: asStringArray(row.health_goals),
    businessGoals: asStringArray(row.business_goals),
    learningGoals: asStringArray(row.learning_goals),
    lifeMilestones: asMilestones(row.life_milestones),
    commitments: asCommitments(row.commitments),
    lastVisionCheckAt:
      typeof row.last_vision_check_at === "string"
        ? row.last_vision_check_at
        : null,
    favoriteScenarios: asStringArray(row.favorite_scenarios),
    pastExercises: asStringArray(row.past_exercises),
    notes:
      row.notes && typeof row.notes === "object"
        ? (row.notes as Record<string, unknown>)
        : {},
    lastSessionId:
      typeof row.last_session_id === "string" ? row.last_session_id : null,
    lastSessionSummary: String(row.last_session_summary ?? ""),
    lastScenarioTitle: String(row.last_scenario_title ?? ""),
    lastSessionAt:
      typeof row.last_session_at === "string" ? row.last_session_at : null,
    sessionsCompleted:
      typeof row.sessions_completed === "number" ? row.sessions_completed : 0,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapReport(row: Record<string, unknown>): SessionReport {
  const transcript = Array.isArray(row.transcript)
    ? (row.transcript as SessionReport["transcript"])
    : [];
  return {
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    sessionNumber:
      typeof row.session_number === "number" ? row.session_number : 1,
    modality: row.modality === "text" ? "text" : "voice",
    durationSeconds:
      typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    overallScore:
      typeof row.overall_score === "number" ? row.overall_score : null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    empathy: typeof row.empathy === "number" ? row.empathy : null,
    listening: typeof row.listening === "number" ? row.listening : null,
    clarity: typeof row.clarity === "number" ? row.clarity : null,
    storytelling:
      typeof row.storytelling === "number" ? row.storytelling : null,
    negotiation:
      typeof row.negotiation === "number" ? row.negotiation : null,
    leadership: typeof row.leadership === "number" ? row.leadership : null,
    questionsAsked:
      typeof row.questions_asked === "number" ? row.questions_asked : 0,
    interruptions:
      typeof row.interruptions === "number" ? row.interruptions : 0,
    fillerWords: typeof row.filler_words === "number" ? row.filler_words : 0,
    breakthrough: String(row.breakthrough ?? ""),
    biggestWeakness: String(row.biggest_weakness ?? ""),
    homework: String(row.homework ?? ""),
    coachSummary: String(row.coach_summary ?? ""),
    transcript,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    scenarioTitle:
      typeof row.scenario_title === "string" ? row.scenario_title : undefined,
    startedAt: typeof row.started_at === "string" ? row.started_at : undefined,
    completedAt:
      typeof row.completed_at === "string" ? row.completed_at : undefined,
  };
}

/** Server-side coach context for Realtime mint + /api/coach. */
export async function loadCoachPromptContextForUser(
  userId: string
): Promise<CoachPromptContext> {
  try {
    const supabase = await createServerSupabaseClient();

    const [{ data: memoryRow }, { data: reportRows }, { data: profile }] =
      await Promise.all([
        supabase.from("coach_memory").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("session_reports")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    let memory = memoryRow
      ? mapMemory(memoryRow as Record<string, unknown>)
      : emptyCoachMemory(userId);

    const display =
      (typeof profile?.display_name === "string" && profile.display_name) ||
      (typeof profile?.first_name === "string" && profile.first_name) ||
      memory.displayName;
    if (display) memory = { ...memory, displayName: display };

    // If memory table missing / empty, synthesize from completed sessions.
    if (!memoryRow && (!reportRows || reportRows.length === 0)) {
      const { data: sessions } = await supabase
        .from("practice_sessions")
        .select("id, scenario_title, completed_at, average_score")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      if (sessions && sessions.length > 0) {
        memory = {
          ...memory,
          displayName: display || memory.displayName,
          sessionsCompleted: sessions.length,
          lastSessionId: sessions[0].id,
          lastScenarioTitle: sessions[0].scenario_title ?? "",
          lastSessionAt: sessions[0].completed_at ?? null,
          lastSessionSummary: sessions[0].average_score
            ? `Last session score ${sessions[0].average_score}.`
            : "You've practiced with Forge before.",
          confidenceLevel: sessions[0].average_score ?? null,
        };
      }
    }

    const reports = (reportRows ?? []).map((row) =>
      mapReport(row as Record<string, unknown>)
    );
    return buildCoachPromptContext(memory, reports);
  } catch {
    return buildCoachPromptContext(emptyCoachMemory(userId));
  }
}

/**
 * After a session opens with purpose follow-ups, gently advance memory so
 * Forge doesn't repeat the same vision check / commitment ask every time.
 */
export async function touchPurposeFollowUpsForUser(
  userId: string
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: memoryRow }, { data: reportRows }] = await Promise.all([
      supabase.from("coach_memory").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("session_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    if (!memoryRow) return;

    const memory = mapMemory(memoryRow as Record<string, unknown>);
    const reports = (reportRows ?? []).map((row) =>
      mapReport(row as Record<string, unknown>)
    );
    const hints = buildPurposePromptHints(memory, reports);
    const now = new Date().toISOString();
    let changed = false;
    let next = { ...memory };

    if (hints.visionCheck) {
      next = { ...next, lastVisionCheckAt: now };
      changed = true;
    }
    if (hints.commitmentFollowUp && next.commitments.length > 0) {
      const openIdx = next.commitments.findIndex((c) => c.status === "open");
      if (openIdx >= 0 && !next.commitments[openIdx].followedUpAt) {
        const commitments = [...next.commitments];
        commitments[openIdx] = {
          ...commitments[openIdx],
          followedUpAt: now,
        };
        next = { ...next, commitments };
        changed = true;
      }
    }
    if (!changed) return;

    await supabase
      .from("coach_memory")
      .update({
        last_vision_check_at: next.lastVisionCheckAt,
        commitments: next.commitments,
        updated_at: now,
      })
      .eq("user_id", userId);
  } catch (err) {
    console.warn("[coach] purpose follow-up touch failed", err);
  }
}
