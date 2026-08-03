import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildCoachPromptContext, emptyCoachMemory } from "@/lib/coach/memory";
import type {
  CoachMemory,
  CoachPromptContext,
  LearningStyle,
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

function mapMemory(row: Record<string, unknown>): CoachMemory {
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
    biggestFears: Array.isArray(row.biggest_fears)
      ? (row.biggest_fears as string[])
      : [],
    recentWins: Array.isArray(row.recent_wins)
      ? (row.recent_wins as string[])
      : [],
    topicsWorkingOn: Array.isArray(row.topics_working_on)
      ? (row.topics_working_on as string[])
      : [],
    preferredCoachingStyle: String(row.preferred_coaching_style ?? ""),
    learningStyle: asLearningStyle(row.learning_style),
    confidenceLevel:
      typeof row.confidence_level === "number" ? row.confidence_level : null,
    biggestStrength: String(row.biggest_strength ?? ""),
    speakingHabits: Array.isArray(row.speaking_habits)
      ? (row.speaking_habits as string[])
      : [],
    emotionalTriggers: Array.isArray(row.emotional_triggers)
      ? (row.emotional_triggers as string[])
      : [],
    favoriteScenarios: Array.isArray(row.favorite_scenarios)
      ? (row.favorite_scenarios as string[])
      : [],
    pastExercises: Array.isArray(row.past_exercises)
      ? (row.past_exercises as string[])
      : [],
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

    const [
      { data: memoryRow },
      { data: reportRows },
      { data: profile },
      { data: livingRow },
    ] = await Promise.all([
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
      supabase
        .from("living_profiles")
        .select("*")
        .eq("user_id", userId)
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

    // Continuity-only synthesis from sessions — never invent identity/confidence.
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
          lastSessionSummary: "You've practiced with Forge before.",
          confidenceLevel: null,
        };
      }
    }

    const livingProfile = livingRow
      ? {
          userId: String(livingRow.user_id),
          version:
            typeof livingRow.version === "number" ? livingRow.version : 0,
          displayName: String(livingRow.display_name ?? ""),
          preferredNickname: String(livingRow.preferred_nickname ?? ""),
          purposeStatement: String(livingRow.purpose_statement ?? ""),
          personalPrinciples: Array.isArray(livingRow.personal_principles)
            ? livingRow.personal_principles
            : [],
          seasons: Array.isArray(livingRow.seasons) ? livingRow.seasons : [],
          coachingIntensity:
            livingRow.coaching_intensity === "gentle" ||
            livingRow.coaching_intensity === "direct" ||
            livingRow.coaching_intensity === "challenging"
              ? livingRow.coaching_intensity
              : ("steady" as const),
          preferredCoachingStyle: String(
            livingRow.preferred_coaching_style ?? ""
          ),
          matteringConversationIds: Array.isArray(
            livingRow.mattering_conversation_ids
          )
            ? livingRow.mattering_conversation_ids
            : [],
          provenance: Array.isArray(livingRow.provenance)
            ? livingRow.provenance
            : [],
          updatedAt: String(livingRow.updated_at ?? new Date().toISOString()),
        }
      : null;

    const reports = (reportRows ?? []).map((row) =>
      mapReport(row as Record<string, unknown>)
    );
    return buildCoachPromptContext(memory, reports, livingProfile);
  } catch {
    return buildCoachPromptContext(emptyCoachMemory(userId));
  }
}
