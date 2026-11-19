export type SessionSpeechEvidence = {
  /** True only after the session audio was durably saved. */
  audioAvailable?: boolean;
};

export function memberSpeechTurns<T extends { role: string }>(turns: T[]): T[] {
  return turns.filter(
    (turn) => turn.role === "founder" || turn.role === "user"
  );
}

function memberTurns(turns: Array<{ role: string; text?: string }>) {
  return memberSpeechTurns(turns).filter(
    (turn) => typeof turn.text === "string" && turn.text.trim().length > 0
  );
}

function isSubstantive(text: string): boolean {
  const normalized = text.trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const letters = (normalized.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) ?? []).length;
  return words.length >= 3 && letters >= 8;
}

/** The completion gate shared by live, retry, report, and recovery. */
export function hasSubstantiveFounderSpeech(
  turns: Array<{ role: string; text?: string }>,
  evidence: SessionSpeechEvidence = {}
): boolean {
  const member = memberTurns(turns);
  return (
    member.some((turn) => isSubstantive(turn.text!)) ||
    (evidence.audioAvailable === true && member.length > 0)
  );
}

/** Transcript fillers are member evidence, never counterpart behavior. */
export function countMemberTranscriptFillers(
  turns: Array<{ role: string; text?: string }>
): number {
  return memberTurns(turns).reduce(
    (count, turn) =>
      count +
      ((turn.text ?? "").match(
        /\b(?:um+|uh+|like|you know|basically|actually|literally)\b/gi
      )?.length ?? 0),
    0
  );
}

export const NO_SPOKEN_THOUGHT_VERDICT = "We didn’t capture a spoken thought in this session.";

export function isNoCaptureVerdict(value: string): boolean {
  return /(?:we didn.t capture a spoken thought|no spoken rep was captured|no practice was captured)/i.test(
    value.trim()
  );
}

export function reportMemoryEvidence(report: {
  breakthrough: string;
  biggestWeakness: string;
}): { breakthrough: string; biggestWeakness: string } {
  return isNoCaptureVerdict(report.breakthrough)
    ? { breakthrough: "", biggestWeakness: "" }
    : {
        breakthrough: report.breakthrough.trim(),
        biggestWeakness: report.biggestWeakness.trim(),
      };
}

/** Apply the same captured/not-captured decision to the durable report. */
export function applySessionCaptureVerdict<T extends {
  overallScore: number | null;
  confidence: number | null;
  empathy: number | null;
  listening: number | null;
  clarity: number | null;
  storytelling: number | null;
  negotiation: number | null;
  leadership: number | null;
  breakthrough: string;
  biggestWeakness: string;
  coachSummary: string;
}>(report: T, captured: boolean): T {
  if (captured) {
    const invalidBreakthrough = isNoCaptureVerdict(report.breakthrough);
    const invalidWeakness = isNoCaptureVerdict(report.biggestWeakness);
    const invalidSummary = isNoCaptureVerdict(report.coachSummary);
    if (!invalidBreakthrough && !invalidWeakness && !invalidSummary) return report;
    const breakthrough = invalidBreakthrough
      ? "You showed up and practiced out loud."
      : report.breakthrough;
    const biggestWeakness = invalidWeakness
      ? "Keep one concrete focus for the next rep."
      : report.biggestWeakness;
    return {
      ...report,
      breakthrough,
      biggestWeakness,
      coachSummary:
        invalidSummary || invalidBreakthrough || invalidWeakness
          ? breakthrough + " Focus next: " + biggestWeakness
          : report.coachSummary,
    };
  }
  return {
    ...report,
    overallScore: null,
    confidence: null,
    empathy: null,
    listening: null,
    clarity: null,
    storytelling: null,
    negotiation: null,
    leadership: null,
    breakthrough: NO_SPOKEN_THOUGHT_VERDICT,
    biggestWeakness: "No practice was captured; try the rep again when your microphone is ready.",
    coachSummary: `${NO_SPOKEN_THOUGHT_VERDICT} No practice was captured; try the rep again when your microphone is ready.`,
  };
}
