import { ensureGuestUser } from "./auth";
import { applyReportToMemory, emptyCoachMemory } from "@/lib/coach/memory";
import {
  buildSessionReport,
  type MomentumLike,
} from "@/lib/coach/report";
import { proposeIdentityEvidenceFromReport } from "@/lib/system1/proposals";
import { attachPendingProposals } from "@/lib/system1/profile";
import {
  countCompletedSessions,
  getCoachMemory,
  getLivingProfile,
  LivingProfileConflictError,
  saveCoachMemory,
  saveLivingProfileProvenance,
  saveSession,
  saveSessionReport,
} from "./storage";
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
  modality?: "voice" | "text";
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
    modality: input.modality ?? "text",
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
  turns: ConversationTurn[],
  options?: {
    momentum?: MomentumLike | null;
    modality?: "voice" | "text";
    durationSeconds?: number | null;
    displayName?: string;
  }
): Promise<PracticeSession> {
  const modality = options?.modality ?? session.modality ?? "text";
  const completedAt = new Date().toISOString();
  const durationSeconds =
    options?.durationSeconds ??
    Math.max(
      0,
      Math.round(
        (Date.parse(completedAt) - Date.parse(session.startedAt)) / 1000
      )
    );

  let sessionNumber = 1;
  try {
    const priorCount = await countCompletedSessions(session.userId);
    // If this session was already completed once, don't double-count.
    sessionNumber = session.completedAt
      ? Math.max(1, priorCount)
      : priorCount + 1;
  } catch {
    sessionNumber = 1;
  }

  const completed: PracticeSession = {
    ...session,
    turns,
    completedAt,
    averageScore: averageForgeScore(turns),
    modality,
    durationSeconds,
  };

  await saveSession(completed);

  // Permanent session report + relationship memory (soft-fail if tables missing)
  try {
    const report = buildSessionReport({
      session: completed,
      turns,
      sessionNumber,
      modality,
      durationSeconds,
      momentum: options?.momentum,
    });

    // Prefer averageScore from report when forge turns absent (voice)
    if (
      typeof completed.averageScore !== "number" &&
      typeof report.overallScore === "number"
    ) {
      completed.averageScore = report.overallScore;
      await saveSession(completed);
    }

    await saveSessionReport(report);

    const existing =
      (await getCoachMemory(session.userId)) ??
      emptyCoachMemory(session.userId, options?.displayName ?? "");
    const nextMemory = applyReportToMemory(
      existing,
      report,
      options?.displayName
    );
    // Keep sessions_completed aligned with report number
    nextMemory.sessionsCompleted = Math.max(
      nextMemory.sessionsCompleted,
      sessionNumber
    );
    await saveCoachMemory(nextMemory);

    // Forge Law #016: session → evidence proposals on Living Profile provenance
    // only (memberConfirmed: false). Never write identity fields from experiences.
    const proposals = proposeIdentityEvidenceFromReport(report);
    if (proposals.length > 0) {
      await appendSessionEvidence(session.userId, proposals);
    }
  } catch (err) {
    console.warn("[coach] failed to persist session report/memory", err);
  }

  return completed;
}

async function appendSessionEvidence(
  userId: string,
  proposals: ReturnType<typeof proposeIdentityEvidenceFromReport>
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await getLivingProfile(userId);
    if (!current) return;

    const next = attachPendingProposals(current, proposals);
    if (next === current) return;

    try {
      await saveLivingProfileProvenance(next);
      return;
    } catch (error) {
      if (error instanceof LivingProfileConflictError && attempt === 0) {
        continue;
      }
      throw error;
    }
  }
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
