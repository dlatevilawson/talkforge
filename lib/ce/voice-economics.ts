/**
 * Invisible AI usage-control layer for Live Arena.
 * Never surface tokens/meters to the member — discipline Forge, not the user.
 */

/** Keep aligned with FORGE_TURN_MAX_OUTPUT_TOKENS in philosophy.ts */
const NORMAL_TURN_MAX_OUTPUT_TOKENS = 240;

export type VoiceTurnKind =
  | "opening"
  | "quick_followup"
  | "normal"
  | "complex"
  | "closing";

export type VoiceEconomicsPlan = "free" | "pro";

/** Soft internal budgets — observability + graceful concise mode, not hard kill. */
export const VOICE_SESSION_SOFT_BUDGET = {
  /** Estimated output tokens before concise mode engages. */
  outputTokensSoft: 6_000,
  /** Concise mode engages at this fraction of soft budget. */
  conciseAtRatio: 0.72,
  /** Absolute safety ceiling — still no abrupt UX kill; only max concise. */
  outputTokensHard: 14_000,
  /** Assistant turns before we prefer quick follow-ups. */
  assistantTurnsSoft: 40,
} as const;

/**
 * Per-turn max_output_tokens for Realtime.
 * Budgets are headroom above spoken brevity targets — the model should finish
 * clean sentences; instructions (not the API ceiling) enforce short turns.
 */
export function outputBudgetForTurn(
  kind: VoiceTurnKind,
  conciseMode: boolean
): number {
  if (conciseMode) {
    if (kind === "opening" || kind === "closing") return 160;
    if (kind === "complex") return 180;
    return 120;
  }
  switch (kind) {
    case "opening":
      // Welcome + continuity + one question needs room; 100 was cutting openings off.
      return 280;
    case "quick_followup":
      return 140;
    case "complex":
      return 320;
    case "closing":
      return 180;
    case "normal":
    default:
      return NORMAL_TURN_MAX_OUTPUT_TOKENS;
  }
}

export type SessionUsageSnapshot = {
  assistantTurns: number;
  estimatedOutputTokens: number;
  estimatedInputTokens: number;
  bargeInCount: number;
  userSpeechEvents: number;
};

export type EconomicsAdvice = {
  conciseMode: boolean;
  nextMaxOutputTokens: number;
  /** Never shown to member — for logs / session.update only. */
  reason: "ok" | "soft_budget" | "turn_pressure" | "hard_budget";
};

export function adviseVoiceEconomics(
  usage: SessionUsageSnapshot,
  nextKind: VoiceTurnKind = "normal"
): EconomicsAdvice {
  const ratio =
    usage.estimatedOutputTokens / VOICE_SESSION_SOFT_BUDGET.outputTokensSoft;
  const turnPressure =
    usage.assistantTurns >= VOICE_SESSION_SOFT_BUDGET.assistantTurnsSoft;
  const hard =
    usage.estimatedOutputTokens >= VOICE_SESSION_SOFT_BUDGET.outputTokensHard;

  if (hard) {
    return {
      conciseMode: true,
      nextMaxOutputTokens: outputBudgetForTurn(nextKind, true),
      reason: "hard_budget",
    };
  }
  if (ratio >= VOICE_SESSION_SOFT_BUDGET.conciseAtRatio) {
    return {
      conciseMode: true,
      nextMaxOutputTokens: outputBudgetForTurn(nextKind, true),
      reason: "soft_budget",
    };
  }
  if (turnPressure) {
    return {
      conciseMode: true,
      nextMaxOutputTokens: outputBudgetForTurn("quick_followup", true),
      reason: "turn_pressure",
    };
  }
  return {
    conciseMode: false,
    nextMaxOutputTokens: outputBudgetForTurn(nextKind, false),
    reason: "ok",
  };
}

/** Rough output token estimate from assistant transcript chars (observability). */
export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

/** Concise-mode instruction appended via session.update — invisible to UI. */
export const CONCISE_MODE_INSTRUCTION = `
ECONOMIC CADENCE (active): Keep every spoken turn to 1–2 short sentences.
One observation or one question, then yield immediately. No frameworks. No monologues.
Member airtime first. Practice over lecture.
`.trim();

/**
 * Very rough USD estimate for observability dashboards.
 * Calibrate later from real invoices — not for member display.
 */
export function estimateSessionCostUsd(usage: {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  durationSeconds: number;
}): number {
  // Placeholder rates for gpt-realtime-class audio sessions (observability only).
  const input = (usage.estimatedInputTokens / 1_000_000) * 32;
  const output = (usage.estimatedOutputTokens / 1_000_000) * 64;
  const audioFloor = (usage.durationSeconds / 60) * 0.06;
  return Math.round((input + output + audioFloor) * 10_000) / 10_000;
}
