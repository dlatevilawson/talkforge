import type {
  PracticeSession,
  ProgressSummary,
  Reflection,
  TalkForgeUser,
} from "./types";
import { notifyTalkForgeStorage } from "./storage-events";
import {
  persistReflectionToSupabase,
  persistSessionToSupabase,
  persistUserToSupabase,
} from "./supabase/persist";

const USER_KEY = "talkforge:user";
const SESSIONS_KEY = "talkforge:sessions";
const REFLECTIONS_KEY = "talkforge:reflections";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  notifyTalkForgeStorage();
}

export function getUser(): TalkForgeUser | null {
  return readJson<TalkForgeUser | null>(USER_KEY, null);
}

export function saveUser(user: TalkForgeUser): void {
  writeJson(USER_KEY, user);
  void persistUserToSupabase(user);
}

export function clearAllTalkForgeData(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(SESSIONS_KEY);
  window.localStorage.removeItem(REFLECTIONS_KEY);
  notifyTalkForgeStorage();
}

export function listSessions(): PracticeSession[] {
  return readJson<PracticeSession[]>(SESSIONS_KEY, []);
}

export function getSession(sessionId: string): PracticeSession | null {
  return listSessions().find((session) => session.id === sessionId) ?? null;
}

export function saveSession(session: PracticeSession): void {
  const sessions = listSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  writeJson(SESSIONS_KEY, sessions);
  void persistSessionToSupabase(session);
}

export function listReflections(): Reflection[] {
  return readJson<Reflection[]>(REFLECTIONS_KEY, []);
}

export function getReflection(sessionId: string): Reflection | null {
  return (
    listReflections().find((reflection) => reflection.sessionId === sessionId) ??
    null
  );
}

export function saveReflection(reflection: Reflection): void {
  const reflections = listReflections().filter(
    (item) => item.sessionId !== reflection.sessionId
  );
  reflections.unshift(reflection);
  writeJson(REFLECTIONS_KEY, reflections);
  void persistReflectionToSupabase(reflection);
}

export function getProgressSummary(userId?: string): ProgressSummary {
  const sessions = listSessions().filter(
    (session) =>
      session.completedAt && (!userId || session.userId === userId)
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
