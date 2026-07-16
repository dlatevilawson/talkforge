import { ensureGuestUser } from "./auth";
import { saveSession } from "./storage";
import type { ConversationTurn, ForgeCoaching, PracticeSession } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createPracticeSession(input: {
  scenarioId: string;
  scenarioTitle: string;
  missionPrompt: string;
}): Promise<PracticeSession> {
  const user = await ensureGuestUser();

  const session: PracticeSession = {
    id: createId(),
    userId: user.id,
    scenarioId: input.scenarioId,
    scenarioTitle: input.scenarioTitle,
    missionPrompt: input.missionPrompt,
    startedAt: new Date().toISOString(),
    turns: [],
  };

  await saveSession(session);
  return session;
}

export function averageForgeScore(
  turns: ConversationTurn[]
): number | undefined {
  const scores = turns
    .filter(
      (turn): turn is { role: "forge"; coaching: ForgeCoaching } =>
        turn.role === "forge"
    )
    .map((turn) => turn.coaching.score);

  if (scores.length === 0) return undefined;

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  );
}

export async function completePracticeSession(
  session: PracticeSession,
  turns: ConversationTurn[]
): Promise<PracticeSession> {
  const completed: PracticeSession = {
    ...session,
    turns,
    completedAt: new Date().toISOString(),
    averageScore: averageForgeScore(turns),
  };

  await saveSession(completed);
  return completed;
}

export async function persistActiveSession(
  session: PracticeSession,
  turns: ConversationTurn[]
): Promise<PracticeSession> {
  const next: PracticeSession = {
    ...session,
    turns,
    averageScore: averageForgeScore(turns),
  };
  await saveSession(next);
  return next;
}
