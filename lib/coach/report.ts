import {
  analyzeTranscriptText,
  averageDimension,
  clampScore,
  skillsFromForgeAverages,
} from "@/lib/coach/metrics";
import type { SessionReport } from "@/lib/coach/types";
import type { ConversationTurn, PracticeSession } from "@/lib/types";
import {
  applySessionCaptureVerdict,
  hasSubstantiveFounderSpeech,
  isNoCaptureVerdict,
} from "@/lib/session-substance";

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
  /** Caller may supply the shared decision after confirming durable audio. */
  capturedSpeech?: boolean;
}): SessionReport {
  const { session, turns, sessionNumber, modality, momentum } = input;
  const capturedSpeech =
    input.capturedSpeech ?? hasSubstantiveFounderSpeech(turns);
  const momentumContainsNoCapture = [
    momentum?.strength,
    momentum?.breakthrough,
    momentum?.biggestWeakness,
    momentum?.coachSummary,
  ].some((value) => typeof value === "string" && isNoCaptureVerdict(value));
  const usableMomentum =
    capturedSpeech && momentumContainsNoCapture ? null : momentum;
  const confidence = clampScore(
    usableMomentum?.confidence ?? averageDimension(turns, "confidence")
  );
  const clarity = clampScore(
    usableMomentum?.clarity ?? averageDimension(turns, "clarity")
  );
  const empathy = clampScore(
    usableMomentum?.empathy ?? averageDimension(turns, "warmth")
  );
  const listening = clampScore(
    usableMomentum?.listening ?? averageDimension(turns, "curiosity")
  );
  const overallScore = clampScore(
    usableMomentum?.overallScore ??
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

  const breakthrough = !capturedSpeech
    ? "We didn't capture a spoken thought in this session."
    :
    usableMomentum?.breakthrough?.trim() ||
    usableMomentum?.strength?.trim() ||
    "You showed up and practiced out loud.";
  const biggestWeakness = !capturedSpeech
    ? "No practice was captured to evaluate."
    :
    usableMomentum?.biggestWeakness?.trim() ||
    usableMomentum?.improve?.trim() ||
    "Keep one concrete focus for the next rep.";
  const homework = !capturedSpeech
    ? "Check your microphone and try the rep again."
    :
    usableMomentum?.homework?.trim() ||
    usableMomentum?.nextAction?.trim() ||
    "Try one clearer opening line in your next real conversation.";
  const coachSummary =
    !capturedSpeech
      ? "We didn't capture a spoken thought in this session. Check your microphone and try the rep again."
      :
    usableMomentum?.coachSummary?.trim() ||
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

  const report: SessionReport = {
    sessionId: session.id,
    userId: session.userId,
    sessionNumber,
    modality,
    durationSeconds,
    overallScore: capturedSpeech ? overallScore : null,
    confidence: capturedSpeech ? confidence : null,
    empathy: capturedSpeech ? empathy : null,
    listening: capturedSpeech ? listening : null,
    clarity: capturedSpeech ? clarity : null,
    storytelling: capturedSpeech ? clampScore(skillBoost.storytelling ?? null) : null,
    negotiation: capturedSpeech ? clampScore(skillBoost.negotiation ?? null) : null,
    leadership: capturedSpeech ? clampScore(skillBoost.leadership ?? null) : null,
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
  return applySessionCaptureVerdict(report, capturedSpeech);
}

export { voiceTurnsToConversationTurns } from "@/lib/voice-turn-mapping";

function averageOf(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
