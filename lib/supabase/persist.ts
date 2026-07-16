import { getSupabaseClient, getSupabaseConfigStatus } from "./client";
import type { PracticeSession, Reflection, TalkForgeUser } from "../types";

export type PersistResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

export function getPersistenceStatus() {
  const config = getSupabaseConfigStatus();
  return {
    ...config,
    backend: config.configured ? ("supabase" as const) : ("local-only" as const),
  };
}

export async function persistUserToSupabase(
  user: TalkForgeUser
): Promise<PersistResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      skipped: true,
      error: getSupabaseConfigStatus().message,
    };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: user.displayName,
    created_at: user.createdAt,
  });

  if (error) {
    console.error("Supabase profile upsert failed:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function persistSessionToSupabase(
  session: PracticeSession
): Promise<PersistResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      skipped: true,
      error: getSupabaseConfigStatus().message,
    };
  }

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
    console.error("Supabase session upsert failed:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function persistReflectionToSupabase(
  reflection: Reflection
): Promise<PersistResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      skipped: true,
      error: getSupabaseConfigStatus().message,
    };
  }

  const { error } = await supabase.from("reflections").upsert({
    session_id: reflection.sessionId,
    user_id: reflection.userId,
    went_well: reflection.wentWell,
    improve_next: reflection.improveNext,
    coach_satisfaction: reflection.coachSatisfaction ?? null,
    created_at: reflection.createdAt,
  });

  if (error) {
    console.error("Supabase reflection upsert failed:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
