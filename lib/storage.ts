import { clearCurrentUserId, getCurrentUserId } from "./identity";
import { getSupabaseClient } from "./supabase/client";
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
}): TalkForgeUser {
  return {
    id: row.id,
    displayName: row.display_name,
    createdAt: row.created_at,
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

export async function getUser(): Promise<TalkForgeUser | null> {
  const id = getCurrentUserId();
  if (!id) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }
  if (!data) return null;
  return mapProfile(data);
}

export async function saveUser(user: TalkForgeUser): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: user.displayName,
    created_at: user.createdAt,
  });

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}

export async function listSessions(userId?: string): Promise<PracticeSession[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from("practice_sessions")
    .select(
      "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns"
    )
    .order("started_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
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
    .select(
      "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }
  if (!data) return null;
  return mapSession(data);
}

export async function saveSession(session: PracticeSession): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("practice_sessions").upsert({
    id: session.id,
    user_id: session.userId,
    scenario_id: session.scenarioId,
    scenario_title: session.scenarioTitle,
    mission_prompt: session.missionPrompt,
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
    average_score: session.averageScore ?? null,
    turns: session.turns,
  });

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`);
  }
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
  const userId = getCurrentUserId();
  clearCurrentUserId();
  if (!userId) return;

  const supabase = requireSupabase();
  // Cascades to practice_sessions and reflections via schema FKs.
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) {
    throw new Error(`Failed to clear profile data: ${error.message}`);
  }
}
