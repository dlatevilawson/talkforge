import {
  analyzeTranscriptText,
  averageDimension,
  clampScore,
  skillsFromForgeAverages,
} from "@/lib/coach/metrics";
import type { SessionReport } from "@/lib/coach/types";
import type { ConversationTurn, PracticeSession } from "@/lib/types";

export type MomentumLike = {
  strength?: string;
  improve?: string;
  nextAction?: string;
  confidence?: number;
  empathy?: number;
  listening?: number;
  clarity?: number;
  overallScore?: number;
  breakthrough?: string;
  biggestWeakness?: string;
  homework?: string;
  coachSummary?: string;
};

function userTextsFromTurns(turns: ConversationTurn[]): string[] {
  return turns
    .filter(
      (turn): turn is { role: "user"; text: string } =>
        turn.role === "user" && typeof turn.text === "string"
    )
    .map((turn) => turn.text);
}

function transcriptFromTurns(
  turns: ConversationTurn[]
): SessionReport["transcript"] {
  const out: SessionReport["transcript"] = [];
  for (const turn of turns) {
    if (turn.role === "user" || turn.role === "npc") {
      out.push({
        role: turn.role === "user" ? "user" : "coach",
        text: turn.text,
      });
    }
  }
  return out;
}

/**
 * Build a permanent SessionReport from a completed practice session.
 * Uses Forge turn scores when present; falls back to momentum + heuristics.
 */
export function buildSessionReport(input: {
  session: PracticeSession;
  turns: ConversationTurn[];
  sessionNumber: number;
  modality: "voice" | "text";
  durationSeconds?: number | null;
  momentum?: MomentumLike | null;
}): SessionReport {
  const { session, turns, sessionNumber, modality, momentum } = input;
  const confidence = clampScore(
    momentum?.confidence ?? averageDimension(turns, "confidence")
  );
  const clarity = clampScore(
    momentum?.clarity ?? averageDimension(turns, "clarity")
  );
  const empathy = clampScore(
    momentum?.empathy ?? averageDimension(turns, "warmth")
  );
  const listening = clampScore(
    momentum?.listening ?? averageDimension(turns, "curiosity")
  );
  const overallScore = clampScore(
    momentum?.overallScore ??
      session.averageScore ??
      averageDimension(turns, "score") ??
      averageOf([confidence, clarity, empathy, listening])
  );

  const habits = analyzeTranscriptText(userTextsFromTurns(turns));
  const skillBoost = skillsFromForgeAverages({
    confidence,
    warmth: empathy,
    curiosity: listening,
    clarity,
    overall: overallScore,
    scenarioId: session.scenarioId,
  });

  const breakthrough =
    momentum?.breakthrough?.trim() ||
    momentum?.strength?.trim() ||
    "You showed up and practiced out loud.";
  const biggestWeakness =
    momentum?.biggestWeakness?.trim() ||
    momentum?.improve?.trim() ||
    "Keep one concrete focus for the next rep.";
  const homework =
    momentum?.homework?.trim() ||
    momentum?.nextAction?.trim() ||
    "Try one clearer opening line in your next real conversation.";
  const coachSummary =
    momentum?.coachSummary?.trim() ||
    [breakthrough, `Focus next: ${biggestWeakness}`, `Homework: ${homework}`]
      .filter(Boolean)
      .join(" ");

  const started = Date.parse(session.startedAt);
  const ended = Date.parse(
    session.completedAt ?? new Date().toISOString()
  );
  const durationSeconds =
    input.durationSeconds ??
    (Number.isFinite(started) && Number.isFinite(ended)
      ? Math.max(0, Math.round((ended - started) / 1000))
      : null);

  return {
    sessionId: session.id,
    userId: session.userId,
    sessionNumber,
    modality,
    durationSeconds,
    overallScore,
    confidence,
    empathy,
    listening,
    clarity,
    storytelling: clampScore(skillBoost.storytelling ?? null),
    negotiation: clampScore(skillBoost.negotiation ?? null),
    leadership: clampScore(skillBoost.leadership ?? null),
    questionsAsked: habits.questionsAsked,
    interruptions: habits.interruptions,
    fillerWords: habits.fillerWords,
    breakthrough,
    biggestWeakness,
    homework,
    coachSummary,
    transcript: transcriptFromTurns(turns),
    createdAt: new Date().toISOString(),
    scenarioTitle: session.scenarioTitle,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

function averageOf(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Map voice transcript turns into ConversationTurn for persistence. */
export function voiceTurnsToConversationTurns(
  turns: Array<{ role: "founder" | "forge"; text: string }>
): ConversationTurn[] {
  return turns
    .filter((t) => typeof t.text === "string" && t.text.trim())
    .map((t) => ({
      role: t.role === "founder" ? ("user" as const) : ("npc" as const),
      text: t.text.trim(),
    }));
}
