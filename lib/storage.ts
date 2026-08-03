import {
  bindAuthenticatedUserId,
  clearCurrentUserId,
  getCurrentUserId,
  isGuestUserId,
} from "./identity";
import { getSupabaseClient } from "./supabase/client";
import { buildGrowthSummary } from "@/lib/coach/growth";
import type {
  CoachMemory,
  GrowthSummary,
  SessionReport,
} from "@/lib/coach/types";
import type { LivingProfile } from "@/lib/system1/types";
import type {
  ConversationTurn,
  PracticeSession,
  ProgressSummary,
  Reflection,
  TalkForgeUser,
} from "./types";

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return client;
}

function mapProfile(row: {
  id: string;
  display_name: string;
  created_at: string;
  email?: string | null;
  role?: string | null;
}): TalkForgeUser {
  return {
    id: row.id,
    displayName: row.display_name || "Member",
    createdAt: row.created_at,
    email: row.email ?? "",
    isGuest: isGuestUserId(row.id),
    role: (row.role as TalkForgeUser["role"]) ?? undefined,
  };
}

function mapSession(row: {
  id: string;
  user_id: string;
  scenario_id: string;
  scenario_title: string;
  mission_prompt: string;
  started_at: string;
  completed_at: string | null;
  average_score: number | null;
  turns: ConversationTurn[] | null;
  modality?: string | null;
  duration_seconds?: number | null;
}): PracticeSession {
  return {
    id: row.id,
    userId: row.user_id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    missionPrompt: row.mission_prompt,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    averageScore: row.average_score ?? undefined,
    turns: Array.isArray(row.turns) ? row.turns : [],
    modality: row.modality === "voice" ? "voice" : "text",
    durationSeconds:
      typeof row.duration_seconds === "number"
        ? row.duration_seconds
        : undefined,
  };
}

function mapSessionReport(row: {
  session_id: string;
  user_id: string;
  session_number: number;
  modality: string;
  duration_seconds: number | null;
  overall_score: number | null;
  confidence: number | null;
  empathy: number | null;
  listening: number | null;
  clarity: number | null;
  storytelling: number | null;
  negotiation: number | null;
  leadership: number | null;
  questions_asked: number;
  interruptions: number;
  filler_words: number;
  breakthrough: string;
  biggest_weakness: string;
  homework: string;
  coach_summary: string;
  transcript: SessionReport["transcript"] | null;
  created_at: string;
  scenario_title?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}): SessionReport {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    sessionNumber: row.session_number,
    modality: row.modality === "text" ? "text" : "voice",
    durationSeconds: row.duration_seconds,
    overallScore: row.overall_score,
    confidence: row.confidence,
    empathy: row.empathy,
    listening: row.listening,
    clarity: row.clarity,
    storytelling: row.storytelling,
    negotiation: row.negotiation,
    leadership: row.leadership,
    questionsAsked: row.questions_asked ?? 0,
    interruptions: row.interruptions ?? 0,
    fillerWords: row.filler_words ?? 0,
    breakthrough: row.breakthrough ?? "",
    biggestWeakness: row.biggest_weakness ?? "",
    homework: row.homework ?? "",
    coachSummary: row.coach_summary ?? "",
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
    createdAt: row.created_at,
    scenarioTitle: row.scenario_title ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

function mapCoachMemory(row: {
  user_id: string;
  display_name: string;
  preferred_nickname?: string | null;
  occupation: string;
  communication_goals: string[] | null;
  long_term_challenges?: string[] | null;
  biggest_fears: string[] | null;
  recent_wins: string[] | null;
  topics_working_on: string[] | null;
  preferred_coaching_style: string;
  learning_style?: string | null;
  confidence_level: number | null;
  biggest_strength?: string | null;
  speaking_habits: string[] | null;
  emotional_triggers?: string[] | null;
  favorite_scenarios: string[] | null;
  past_exercises: string[] | null;
  notes: Record<string, unknown> | null;
  last_session_id: string | null;
  last_session_summary: string;
  last_scenario_title: string;
  last_session_at?: string | null;
  sessions_completed: number;
  updated_at: string;
}): CoachMemory {
  const learning = row.learning_style;
  const learningStyle =
    learning === "practice_first" ||
    learning === "reflect_first" ||
    learning === "example_first" ||
    learning === "challenge_first"
      ? learning
      : ("" as const);

  return {
    userId: row.user_id,
    displayName: row.display_name ?? "",
    preferredNickname: row.preferred_nickname ?? "",
    occupation: row.occupation ?? "",
    communicationGoals: row.communication_goals ?? [],
    longTermChallenges: row.long_term_challenges ?? [],
    biggestFears: row.biggest_fears ?? [],
    recentWins: row.recent_wins ?? [],
    topicsWorkingOn: row.topics_working_on ?? [],
    preferredCoachingStyle: row.preferred_coaching_style ?? "",
    learningStyle,
    confidenceLevel: row.confidence_level,
    biggestStrength: row.biggest_strength ?? "",
    speakingHabits: row.speaking_habits ?? [],
    emotionalTriggers: row.emotional_triggers ?? [],
    favoriteScenarios: row.favorite_scenarios ?? [],
    pastExercises: row.past_exercises ?? [],
    notes: row.notes ?? {},
    lastSessionId: row.last_session_id,
    lastSessionSummary: row.last_session_summary ?? "",
    lastScenarioTitle: row.last_scenario_title ?? "",
    lastSessionAt: row.last_session_at ?? null,
    sessionsCompleted: row.sessions_completed ?? 0,
    updatedAt: row.updated_at,
  };
}

function mapReflection(row: {
  session_id: string;
  user_id: string;
  went_well: string;
  improve_next: string;
  coach_satisfaction: number | null;
  created_at: string;
}): Reflection {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    wentWell: row.went_well,
    improveNext: row.improve_next,
    coachSatisfaction: row.coach_satisfaction ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Resolve the active user. Supabase Auth is authoritative — never prefer a
 * stale guest id in sessionStorage once an authenticated session exists.
 */
export async function getUser(): Promise<TalkForgeUser | null> {
  const supabase = requireSupabase();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    // Soft-fail auth lookup and fall through to cached pointer for rare races.
  }

  if (authUser?.id) {
    bindAuthenticatedUserId(authUser.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, created_at, email, role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load profile: ${error.message}`);
    }

    if (data) {
      return mapProfile(data);
    }

    // Profile trigger may lag briefly after signup — synthesize from auth user.
    return {
      id: authUser.id,
      displayName:
        (typeof authUser.user_metadata?.display_name === "string" &&
          authUser.user_metadata.display_name.trim()) ||
        authUser.email?.split("@")[0] ||
        "Member",
      createdAt: authUser.created_at ?? new Date().toISOString(),
      email: authUser.email ?? "",
      isGuest: false,
      role: "user",
    };
  }

  // Unauthenticated: only return a legacy guest pointer (never a stale auth UUID).
  const cachedId = getCurrentUserId();
  if (!cachedId || !isGuestUserId(cachedId)) {
    if (cachedId && !isGuestUserId(cachedId)) {
      clearCurrentUserId();
    }
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at, email, role")
    .eq("id", cachedId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }
  if (!data) return null;
  return mapProfile(data);
}

export async function saveUser(user: TalkForgeUser): Promise<void> {
  const supabase = requireSupabase();
  // Profiles are created by auth triggers — clients may only update safe fields.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: user.displayName })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}

const SESSION_SELECT =
  "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns, modality, duration_seconds";

export async function listSessions(userId?: string): Promise<PracticeSession[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from("practice_sessions")
    .select(SESSION_SELECT)
    .order("started_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback if modality columns not migrated yet
    if (error.message.includes("modality") || error.message.includes("duration")) {
      let legacy = supabase
        .from("practice_sessions")
        .select(
          "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns"
        )
        .order("started_at", { ascending: false });
      if (userId) legacy = legacy.eq("user_id", userId);
      const retry = await legacy;
      if (retry.error) {
        throw new Error(`Failed to list sessions: ${retry.error.message}`);
      }
      return (retry.data ?? []).map(mapSession);
    }
    throw new Error(`Failed to list sessions: ${error.message}`);
  }
  return (data ?? []).map(mapSession);
}

export async function getSession(
  sessionId: string
): Promise<PracticeSession | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("modality") || error.message.includes("duration")) {
      const retry = await supabase
        .from("practice_sessions")
        .select(
          "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (retry.error) {
        throw new Error(`Failed to load session: ${retry.error.message}`);
      }
      if (!retry.data) return null;
      return mapSession(retry.data);
    }
    throw new Error(`Failed to load session: ${error.message}`);
  }
  if (!data) return null;
  return mapSession(data);
}

export async function saveSession(session: PracticeSession): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    id: session.id,
    user_id: session.userId,
    scenario_id: session.scenarioId,
    scenario_title: session.scenarioTitle,
    mission_prompt: session.missionPrompt,
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
    average_score: session.averageScore ?? null,
    turns: session.turns,
    modality: session.modality ?? "text",
    duration_seconds: session.durationSeconds ?? null,
  };

  const { error } = await supabase.from("practice_sessions").upsert(payload);

  if (error) {
    if (error.message.includes("modality") || error.message.includes("duration")) {
      const legacy = {
        id: payload.id,
        user_id: payload.user_id,
        scenario_id: payload.scenario_id,
        scenario_title: payload.scenario_title,
        mission_prompt: payload.mission_prompt,
        started_at: payload.started_at,
        completed_at: payload.completed_at,
        average_score: payload.average_score,
        turns: payload.turns,
      };
      const retry = await supabase.from("practice_sessions").upsert(legacy);
      if (retry.error) {
        throw new Error(`Failed to save session: ${retry.error.message}`);
      }
      return;
    }
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

export async function countCompletedSessions(userId: string): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from("practice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (error) return 0;
  return count ?? 0;
}

export async function saveSessionReport(report: SessionReport): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("session_reports").upsert({
    session_id: report.sessionId,
    user_id: report.userId,
    session_number: report.sessionNumber,
    modality: report.modality,
    duration_seconds: report.durationSeconds,
    overall_score: report.overallScore,
    confidence: report.confidence,
    empathy: report.empathy,
    listening: report.listening,
    clarity: report.clarity,
    storytelling: report.storytelling,
    negotiation: report.negotiation,
    leadership: report.leadership,
    questions_asked: report.questionsAsked,
    interruptions: report.interruptions,
    filler_words: report.fillerWords,
    breakthrough: report.breakthrough,
    biggest_weakness: report.biggestWeakness,
    homework: report.homework,
    coach_summary: report.coachSummary,
    transcript: report.transcript,
    created_at: report.createdAt,
  });

  if (error) {
    // Soft-fail before migration is applied — session row still saved.
    if (
      error.message.includes("session_reports") ||
      error.code === "PGRST205" ||
      error.message.includes("schema cache")
    ) {
      console.warn("[coach] session_reports unavailable:", error.message);
      return;
    }
    throw new Error(`Failed to save session report: ${error.message}`);
  }
}

export async function listSessionReports(
  userId: string
): Promise<SessionReport[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("session_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (
      error.message.includes("session_reports") ||
      error.code === "PGRST205" ||
      error.message.includes("schema cache")
    ) {
      return [];
    }
    throw new Error(`Failed to list session reports: ${error.message}`);
  }

  const reports = (data ?? []).map(mapSessionReport);

  // Attach scenario titles from sessions when missing
  if (reports.length === 0) return reports;
  const ids = reports.map((r) => r.sessionId);
  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("id, scenario_title, started_at, completed_at")
    .in("id", ids);

  const byId = new Map(
    (sessions ?? []).map((s) => [
      s.id as string,
      s as {
        id: string;
        scenario_title: string;
        started_at: string;
        completed_at: string | null;
      },
    ])
  );

  return reports.map((report) => {
    const session = byId.get(report.sessionId);
    if (!session) return report;
    return {
      ...report,
      scenarioTitle: report.scenarioTitle ?? session.scenario_title,
      startedAt: report.startedAt ?? session.started_at,
      completedAt: report.completedAt ?? session.completed_at ?? undefined,
    };
  });
}

export async function getSessionReport(
  sessionId: string
): Promise<SessionReport | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("session_reports")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("session_reports") ||
      error.code === "PGRST205"
    ) {
      return null;
    }
    throw new Error(`Failed to load session report: ${error.message}`);
  }
  if (!data) return null;
  return mapSessionReport(data);
}

export async function getCoachMemory(
  userId: string
): Promise<CoachMemory | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("coach_memory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("coach_memory") || error.code === "PGRST205") {
      return null;
    }
    throw new Error(`Failed to load coach memory: ${error.message}`);
  }
  if (!data) return null;
  return mapCoachMemory(data);
}

export async function saveCoachMemory(memory: CoachMemory): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    user_id: memory.userId,
    display_name: memory.displayName,
    preferred_nickname: memory.preferredNickname,
    occupation: memory.occupation,
    communication_goals: memory.communicationGoals,
    long_term_challenges: memory.longTermChallenges,
    biggest_fears: memory.biggestFears,
    recent_wins: memory.recentWins,
    topics_working_on: memory.topicsWorkingOn,
    preferred_coaching_style: memory.preferredCoachingStyle,
    learning_style: memory.learningStyle || "",
    confidence_level: memory.confidenceLevel,
    biggest_strength: memory.biggestStrength,
    speaking_habits: memory.speakingHabits,
    emotional_triggers: memory.emotionalTriggers,
    favorite_scenarios: memory.favoriteScenarios,
    past_exercises: memory.pastExercises,
    notes: memory.notes,
    last_session_id: memory.lastSessionId,
    last_session_summary: memory.lastSessionSummary,
    last_scenario_title: memory.lastScenarioTitle,
    last_session_at: memory.lastSessionAt,
    sessions_completed: memory.sessionsCompleted,
    updated_at: memory.updatedAt,
  };

  const { error } = await supabase.from("coach_memory").upsert(payload);

  if (error) {
    // Soft-fallback if Phase 1 columns not migrated yet
    if (
      error.message.includes("preferred_nickname") ||
      error.message.includes("long_term_challenges") ||
      error.message.includes("learning_style") ||
      error.message.includes("biggest_strength") ||
      error.message.includes("emotional_triggers") ||
      error.message.includes("last_session_at")
    ) {
      const legacy = {
        user_id: payload.user_id,
        display_name: payload.display_name,
        occupation: payload.occupation,
        communication_goals: payload.communication_goals,
        biggest_fears: payload.biggest_fears,
        recent_wins: payload.recent_wins,
        topics_working_on: payload.topics_working_on,
        preferred_coaching_style: payload.preferred_coaching_style,
        confidence_level: payload.confidence_level,
        speaking_habits: payload.speaking_habits,
        favorite_scenarios: payload.favorite_scenarios,
        past_exercises: payload.past_exercises,
        notes: payload.notes,
        last_session_id: payload.last_session_id,
        last_session_summary: payload.last_session_summary,
        last_scenario_title: payload.last_scenario_title,
        sessions_completed: payload.sessions_completed,
        updated_at: payload.updated_at,
      };
      const retry = await supabase.from("coach_memory").upsert(legacy);
      if (retry.error) {
        throw new Error(`Failed to save coach memory: ${retry.error.message}`);
      }
      return;
    }
    if (error.message.includes("coach_memory") || error.code === "PGRST205") {
      console.warn("[coach] coach_memory unavailable:", error.message);
      return;
    }
    throw new Error(`Failed to save coach memory: ${error.message}`);
  }
}

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

/** Living Profile SSOT — soft-fails if table not migrated yet. */
export async function getLivingProfile(
  userId: string
): Promise<LivingProfile | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("living_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("living_profiles") ||
      error.code === "PGRST205"
    ) {
      return null;
    }
    throw new Error(`Failed to load living profile: ${error.message}`);
  }
  if (!data) return null;
  return mapLivingProfile(data);
}

export async function saveLivingProfileProvenance(
  profile: Pick<LivingProfile, "userId" | "provenance" | "updatedAt">
): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    provenance: profile.provenance,
    updated_at: profile.updatedAt,
  };

  const { data, error } = await supabase
    .from("living_profiles")
    .update(payload)
    .eq("user_id", profile.userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("living_profiles") ||
      error.code === "PGRST205"
    ) {
      console.warn("[system1] living_profiles unavailable:", error.message);
      return;
    }
    throw new Error(`Failed to save living profile: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      "Cannot append session evidence before a Living Profile exists."
    );
  }
}

export async function getGrowthSummary(userId: string): Promise<GrowthSummary> {
  const reports = await listSessionReports(userId);
  if (reports.length > 0) {
    return buildGrowthSummary(reports);
  }

  // Fallback: derive a thin growth view from completed practice_sessions
  const sessions = (await listSessions(userId)).filter((s) => s.completedAt);
  if (sessions.length === 0) {
    return buildGrowthSummary([]);
  }

  const synthetic: SessionReport[] = sessions.map((session, index) => ({
    sessionId: session.id,
    userId: session.userId,
    sessionNumber: sessions.length - index,
    modality: session.modality ?? "text",
    durationSeconds: session.durationSeconds ?? null,
    overallScore: session.averageScore ?? null,
    confidence: session.averageScore ?? null,
    empathy: null,
    listening: null,
    clarity: session.averageScore ?? null,
    storytelling: null,
    negotiation: null,
    leadership: null,
    questionsAsked: 0,
    interruptions: 0,
    fillerWords: 0,
    breakthrough: "",
    biggestWeakness: "",
    homework: "",
    coachSummary: "",
    transcript: [],
    createdAt: session.completedAt ?? session.startedAt,
    scenarioTitle: session.scenarioTitle,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  }));

  return buildGrowthSummary(synthetic);
}

export async function listReflections(userId?: string): Promise<Reflection[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from("reflections")
    .select(
      "session_id, user_id, went_well, improve_next, coach_satisfaction, created_at"
    )
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list reflections: ${error.message}`);
  }
  return (data ?? []).map(mapReflection);
}

export async function getReflection(
  sessionId: string
): Promise<Reflection | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("reflections")
    .select(
      "session_id, user_id, went_well, improve_next, coach_satisfaction, created_at"
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load reflection: ${error.message}`);
  }
  if (!data) return null;
  return mapReflection(data);
}

export async function saveReflection(reflection: Reflection): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("reflections").upsert({
    session_id: reflection.sessionId,
    user_id: reflection.userId,
    went_well: reflection.wentWell,
    improve_next: reflection.improveNext,
    coach_satisfaction: reflection.coachSatisfaction ?? null,
    created_at: reflection.createdAt,
  });

  if (error) {
    throw new Error(`Failed to save reflection: ${error.message}`);
  }
}

export async function getProgressSummary(
  userId?: string
): Promise<ProgressSummary> {
  const sessions = (await listSessions(userId)).filter(
    (session) => session.completedAt
  );

  if (sessions.length === 0) {
    return {
      sessionsCompleted: 0,
      averageScore: 0,
      lastSessionAt: null,
      lastScenarioTitle: null,
    };
  }

  const scored = sessions.filter(
    (session) => typeof session.averageScore === "number"
  );
  const averageScore =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, session) => sum + (session.averageScore ?? 0), 0) /
            scored.length
        );

  const latest = [...sessions].sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
  )[0];

  return {
    sessionsCompleted: sessions.length,
    averageScore,
    lastSessionAt: latest.completedAt ?? null,
    lastScenarioTitle: latest.scenarioTitle,
  };
}

export async function clearAllTalkForgeData(): Promise<void> {
  const supabase = requireSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const userId = authUser?.id ?? getCurrentUserId();
  clearCurrentUserId();
  if (!userId) return;

  // Cascades to practice_sessions and reflections via schema FKs.
  // Authenticated members typically cannot delete their own profile under RLS —
  // clear practice rows they own instead.
  const { error: sessionsError } = await supabase
    .from("practice_sessions")
    .delete()
    .eq("user_id", userId);
  if (sessionsError) {
    throw new Error(`Failed to clear sessions: ${sessionsError.message}`);
  }
  const { error: reflectionsError } = await supabase
    .from("reflections")
    .delete()
    .eq("user_id", userId);
  if (reflectionsError) {
    throw new Error(`Failed to clear reflections: ${reflectionsError.message}`);
  }
}
