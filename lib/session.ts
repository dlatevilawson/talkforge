import { ensureGuestUser } from "./auth";
import { applyReportToMemory, emptyCoachMemory } from "@/lib/coach/memory";
import {
  buildSessionReport,
  type MomentumLike,
} from "@/lib/coach/report";
import { proposeIdentityEvidenceFromReport } from "@/lib/system1/proposals";
import { attachPendingProposals } from "@/lib/system1/profile";
import { queueShadowReadinessEvaluation } from "@/lib/readiness/shadow-client";
import {
  countCompletedSessions,
  getCoachMemory,
  getLivingProfile,
  getSession,
  LivingProfileConflictError,
  saveCoachMemory,
  saveLivingProfileProvenance,
  saveSession,
  saveDrillCompletion,
  saveSessionReport,
} from "./storage";
import type { ConversationTurn, ForgeCoaching, PracticeSession } from "./types";
import type { TranscriptTurn } from "@/lib/ce/transcript";
import { persistSpeechCapture } from "@/lib/speech/persistence";

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
  drillId?: string;
  programId?: string;
  purpose?: "diagnostic" | "drill" | "check_in" | "emergency" | "free_practice";
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
    drillId: input.drillId,
    programId: input.programId,
    purpose: input.purpose ?? "free_practice",
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
    speechCapture?: { audioBlob: Blob | null; turns: TranscriptTurn[] };
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

  if (modality === "voice" && options?.speechCapture) {
    try {
      const reportFillerCount = turns
        .filter(
          (turn): turn is Extract<ConversationTurn, { role: "user" | "npc" }> =>
            turn.role === "user" || turn.role === "npc"
        )
        .reduce((count, turn) => count + (turn.text.match(/\b(?:um+|uh+|like|you know|basically)\b/gi)?.length ?? 0), 0);
      await persistSpeechCapture({
        sessionId: completed.id,
        userId: completed.userId,
        durationSeconds,
        fillerCount: reportFillerCount,
        capture: options.speechCapture,
      });
    } catch (error) {
      // Audio is supplemental evidence; never block the core session history.
      console.warn("[speech] failed to persist evidence", error);
    }
  }

  if (completed.drillId) {
    if (completed.programId && typeof window !== "undefined") {
      const response = await fetch("/api/journey/complete-day", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programId: completed.programId,
          drillId: completed.drillId,
          sessionId: completed.id,
          completedAt,
        }),
      });
      if (!response.ok) throw new Error("Failed to complete the training day.");
    } else if (typeof window !== "undefined") {
      const response = await fetch("/api/journey/complete-day", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drillId: completed.drillId, sessionId: completed.id, completedAt }),
      });
      if (!response.ok) throw new Error("Failed to save the drill completion.");
    }
  }

  // Persist the report before the softer memory/provenance work. A completed
  // voice drill must never finish without its own report.
  const report = buildSessionReport({
    session: completed,
    turns,
    sessionNumber,
    modality,
    durationSeconds,
    momentum: options?.momentum,
  });
  if (
    typeof completed.averageScore !== "number" &&
    typeof report.overallScore === "number"
  ) {
    completed.averageScore = report.overallScore;
    await saveSession(completed);
  }
  await saveSessionReport(report);

  // Relationship memory and shadow evaluation remain soft-fail work.
  try {
    // Decision 064: allowlisted, server-only shadow evaluation. Fire-and-forget
    // and never expose evaluator state or delay the member's session ending.
    queueShadowReadinessEvaluation(completed.id);

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

export async function loadIncompletePracticeSession(
  sessionId: string
): Promise<PracticeSession | null> {
  if (!sessionId) return null;
  try {
    const session = await getSession(sessionId);
    if (!session || session.completedAt) return null;
    return session;
  } catch (error) {
    console.warn("[session] load incomplete practice failed", error);
    return null;
  }
}

export async function persistActiveSession(
  session: PracticeSession,
  turns: ConversationTurn[]
): Promise<PracticeSession> {
  // Never clear a completed session — in-flight turn upserts must not race End.
  const next: PracticeSession = {
    ...session,
    turns,
    averageScore: averageForgeScore(turns),
    completedAt: session.completedAt,
  };
  await saveSession(next);
  return next;
}

