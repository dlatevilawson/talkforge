import { applyReportToMemory, emptyCoachMemory } from "@/lib/coach/memory";
import { buildSessionReport } from "@/lib/coach/report";
import type { CoachMemory, SessionReport } from "@/lib/coach/types";
import { hasSubstantiveFounderSpeech } from "@/lib/session-substance";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ConversationTurn, PracticeSession } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RecoveryResult = {
  status: "recovered" | "already_completed" | "not_found";
  sessionId: string;
  hadSubstantiveSpeech: boolean;
  audio: "missing" | "present";
};

function mapSession(row: Record<string, unknown>): PracticeSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    scenarioId: String(row.scenario_id ?? "free-practice"),
    scenarioTitle: String(row.scenario_title ?? "Practice"),
    missionPrompt: String(row.mission_prompt ?? ""),
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : undefined,
    lastActivityAt: typeof row.last_activity_at === "string" ? row.last_activity_at : undefined,
    averageScore: typeof row.average_score === "number" ? row.average_score : undefined,
    turns: Array.isArray(row.turns) ? row.turns as ConversationTurn[] : [],
    modality: row.modality === "voice" ? "voice" : "text",
    durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : undefined,
    drillId: typeof row.drill_id === "string" ? row.drill_id : undefined,
    programId: typeof row.program_id === "string" ? row.program_id : undefined,
    purpose: row.purpose === "drill" ? "drill" : row.purpose === "diagnostic" ? "diagnostic" : row.purpose === "check_in" ? "check_in" : row.purpose === "emergency" ? "emergency" : "free_practice",
  };
}

function mapMemory(row: Record<string, unknown>): CoachMemory {
  return {
    userId: String(row.user_id), displayName: String(row.display_name ?? ""), preferredNickname: String(row.preferred_nickname ?? ""), occupation: String(row.occupation ?? ""),
    communicationGoals: Array.isArray(row.communication_goals) ? row.communication_goals as string[] : [], longTermChallenges: Array.isArray(row.long_term_challenges) ? row.long_term_challenges as string[] : [], biggestFears: Array.isArray(row.biggest_fears) ? row.biggest_fears as string[] : [], recentWins: Array.isArray(row.recent_wins) ? row.recent_wins as string[] : [], topicsWorkingOn: Array.isArray(row.topics_working_on) ? row.topics_working_on as string[] : [], preferredCoachingStyle: String(row.preferred_coaching_style ?? ""),
    learningStyle: row.learning_style === "practice_first" || row.learning_style === "reflect_first" || row.learning_style === "example_first" || row.learning_style === "challenge_first" ? row.learning_style : "", confidenceLevel: typeof row.confidence_level === "number" ? row.confidence_level : null, biggestStrength: String(row.biggest_strength ?? ""), speakingHabits: Array.isArray(row.speaking_habits) ? row.speaking_habits as string[] : [], emotionalTriggers: Array.isArray(row.emotional_triggers) ? row.emotional_triggers as string[] : [], favoriteScenarios: Array.isArray(row.favorite_scenarios) ? row.favorite_scenarios as string[] : [], pastExercises: Array.isArray(row.past_exercises) ? row.past_exercises as string[] : [], notes: row.notes && typeof row.notes === "object" ? row.notes as Record<string, unknown> : {}, lastSessionId: typeof row.last_session_id === "string" ? row.last_session_id : null, lastSessionSummary: String(row.last_session_summary ?? ""), lastScenarioTitle: String(row.last_scenario_title ?? ""), lastSessionAt: typeof row.last_session_at === "string" ? row.last_session_at : null, sessionsCompleted: Number(row.sessions_completed ?? 0), updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function memoryPayload(memory: CoachMemory) {
  return {
    user_id: memory.userId, display_name: memory.displayName, preferred_nickname: memory.preferredNickname, occupation: memory.occupation, communication_goals: memory.communicationGoals, long_term_challenges: memory.longTermChallenges, biggest_fears: memory.biggestFears, recent_wins: memory.recentWins, topics_working_on: memory.topicsWorkingOn, preferred_coaching_style: memory.preferredCoachingStyle, learning_style: memory.learningStyle || "", confidence_level: memory.confidenceLevel, biggest_strength: memory.biggestStrength, speaking_habits: memory.speakingHabits, emotional_triggers: memory.emotionalTriggers, favorite_scenarios: memory.favoriteScenarios, past_exercises: memory.pastExercises, notes: memory.notes, last_session_id: memory.lastSessionId, last_session_summary: memory.lastSessionSummary, last_scenario_title: memory.lastScenarioTitle, last_session_at: memory.lastSessionAt, sessions_completed: memory.sessionsCompleted, updated_at: memory.updatedAt,
  };
}

function reportPayload(report: SessionReport) {
  return {
    session_id: report.sessionId, user_id: report.userId, session_number: report.sessionNumber, modality: report.modality, duration_seconds: report.durationSeconds, overall_score: report.overallScore, confidence: report.confidence, empathy: report.empathy, listening: report.listening, clarity: report.clarity, storytelling: report.storytelling, negotiation: report.negotiation, leadership: report.leadership, questions_asked: report.questionsAsked, interruptions: report.interruptions, filler_words: report.fillerWords, breakthrough: report.breakthrough, biggest_weakness: report.biggestWeakness, homework: report.homework, coach_summary: report.coachSummary, transcript: report.transcript, created_at: report.createdAt,
  };
}

function transcriptFillerCount(turns: ConversationTurn[]): number {
  return turns.reduce((count, turn) => {
    if (turn.role !== "user" && turn.role !== "npc") return count;
    return count + (turn.text.match(/\b(?:um+|uh+|like|you know|basically)\b/gi)?.length ?? 0);
  }, 0);
}

export async function recoverIncompleteSession(
  sessionId: string,
  userId?: string,
  admin = createAdminSupabaseClient()
): Promise<RecoveryResult> {
  let query = admin.from("practice_sessions").select("*").eq("id", sessionId);
  if (userId) query = query.eq("user_id", userId);
  const { data: row, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load session: ${error.message}`);
  if (!row) return { status: "not_found", sessionId, hadSubstantiveSpeech: false, audio: "missing" };
  if (row.completed_at) return { status: "already_completed", sessionId, hadSubstantiveSpeech: hasSubstantiveFounderSpeech(Array.isArray(row.turns) ? row.turns : []), audio: "missing" };

  const session = mapSession(row as Record<string, unknown>);
  const turns = session.turns;
  const substantive = hasSubstantiveFounderSpeech(turns);
  const completedAt = new Date().toISOString();
  const durationSeconds = Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(session.startedAt)) / 1000));
  const { count } = await admin.from("practice_sessions").select("id", { count: "exact", head: true }).eq("user_id", session.userId).not("completed_at", "is", null);
  const sessionNumber = (count ?? 0) + 1;
  const completed = { ...session, completedAt, durationSeconds, averageScore: undefined, lastActivityAt: completedAt };
  const { error: updateError } = await admin.from("practice_sessions").update({ completed_at: completedAt, duration_seconds: durationSeconds, last_activity_at: completedAt, average_score: null }).eq("id", session.id).eq("user_id", session.userId);
  if (updateError) throw new Error(`Failed to close incomplete session: ${updateError.message}`);

  const report = buildSessionReport({ session: completed, turns, sessionNumber, modality: session.modality ?? "voice", durationSeconds, momentum: { strength: substantive ? undefined : "We didn’t capture a spoken thought in this session.", improve: substantive ? undefined : "No practice was captured; try the rep again when your microphone is ready.", nextAction: "Review this session and choose one small next rep." } });
  if (!substantive) {
    report.overallScore = null;
    report.confidence = null;
    report.empathy = null;
    report.listening = null;
    report.clarity = null;
    report.storytelling = null;
    report.negotiation = null;
    report.leadership = null;
    report.breakthrough = "We didn’t capture a spoken thought in this session.";
    report.biggestWeakness = "No practice was captured; try the rep again when your microphone is ready.";
    report.coachSummary = `${report.breakthrough} ${report.biggestWeakness}`;
  }
  const { error: reportError } = await admin.from("session_reports").upsert(reportPayload(report));
  if (reportError) throw new Error(`Failed to save recovered report: ${reportError.message}`);

  const { data: memoryRow } = await admin.from("coach_memory").select("*").eq("user_id", session.userId).maybeSingle();
  const memory = memoryRow ? mapMemory(memoryRow as Record<string, unknown>) : emptyCoachMemory(session.userId);
  const nextMemory = applyReportToMemory(memory, report);
  const { error: memoryError } = await admin.from("coach_memory").upsert(memoryPayload(nextMemory));
  if (memoryError) throw new Error(`Failed to update recovered memory: ${memoryError.message}`);

  // No audio blob can be invented. Preserve only the observed transcript-level
  // filler count; all audio-derived metrics remain null.
  if (session.modality === "voice") {
    await admin.from("speech_metrics").upsert({ session_id: session.id, user_id: session.userId, filler_count: transcriptFillerCount(turns), filler_density_per_100_words: null, pace_wpm: null, pause_count: null, pause_total_ms: null, longest_pause_ms: null, member_talk_time_pct: null, member_speaking_time_ms: null, measured_at: null });
  }

  if (substantive && session.drillId) {
    let dayId: string | null = null;
    if (session.programId) {
      const { data: pendingDay } = await admin.from("program_days").select("id").eq("program_id", session.programId).eq("drill_id", session.drillId).eq("status", "pending").order("day_index").limit(1).maybeSingle();
      if (pendingDay) {
        dayId = pendingDay.id;
      } else {
        const { data: doneDay } = await admin.from("program_days").select("id").eq("program_id", session.programId).eq("drill_id", session.drillId).eq("status", "done").order("day_index", { ascending: false }).limit(1).maybeSingle();
        dayId = doneDay?.id ?? null;
      }
    }
    await admin.from("drill_completions").upsert({ day_id: dayId, member_id: session.userId, drill_id: session.drillId, practice_session_id: session.id, completed_at: completedAt, notes: "Recovered from saved turns; audio was not available." }, { onConflict: "member_id,drill_id,practice_session_id" });
    if (dayId) await admin.from("program_days").update({ status: "done", completed_at: completedAt }).eq("id", dayId);
  }
  return { status: "recovered", sessionId, hadSubstantiveSpeech: substantive, audio: "missing" };
}

export async function recoverStaleIncompleteSessions(
  admin = createAdminSupabaseClient(),
  staleMinutes = 15
) {
  const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();
  const { data, error } = await admin.from("practice_sessions").select("id,user_id,turns").is("completed_at", null).lt("last_activity_at", cutoff).limit(50);
  if (error) throw new Error(`Failed to find stale sessions: ${error.message}`);
  const results = [];
  for (const session of (data ?? []).filter((item) => Array.isArray(item.turns) && item.turns.length > 0)) results.push(await recoverIncompleteSession(session.id, session.user_id, admin));
  return results;
}
