/**
 * Invisible AI usage-control layer for Live Arena.
 * Never surface tokens/meters to the member — discipline Forge, not the user.
 *
 * CRITICAL: OpenAI Realtime `max_output_tokens` counts **audio tokens**, not
 * text tokens. Roughly ~50 audio tokens ≈ 1 second of generated speech.
 * Text-scale ceilings (100–280) hard-truncate Forge mid-sentence.
 */

/** Keep aligned with FORGE_TURN_MAX_OUTPUT_TOKENS in philosophy.ts */
const NORMAL_TURN_MAX_OUTPUT_TOKENS = 1000;

/**
 * Realtime audio token ceilings.
 * ~50 audio tokens / second of speech. Brevity is enforced by prompt, not by
 * cutting the API mid-word.
 */
export const REALTIME_TOKEN_CEILINGS = {
  /** ~20s — clean 2–3 sentence coaching turn */
  NORMAL_TURN_MAX_TOKENS: 1000,
  /** ~30s — openings / richer wrap-style beats */
  SESSION_OPENING_MAX_TOKENS: 1500,
  /** ~24s — denser coaching when needed */
  COMPLEX_TURN_MAX_TOKENS: 1200,
  /** ~16s — short follow-ups with finish-the-sentence headroom */
  QUICK_FOLLOWUP_MAX_TOKENS: 800,
  /** ~20s — closing */
  CLOSING_MAX_TOKENS: 1000,
  /** Concise mode still allows finishing a short spoken thought (~15s) */
  CONCISE_TURN_MAX_TOKENS: 750,
  CONCISE_OPENING_MAX_TOKENS: 1000,
} as const;

/** Approximate Realtime audio burn rate for docs / diagnostics. */
export const REALTIME_AUDIO_TOKENS_PER_SECOND = 50;

export type VoiceTurnKind =
  | "opening"
  | "quick_followup"
  | "normal"
  | "complex"
  | "closing";

export type VoiceEconomicsPlan = "free" | "pro";

/**
 * Soft internal budgets — observability + graceful concise mode, not hard kill.
 * These track transcript-estimated tokens (text-ish), not Realtime audio burn.
 * When concise engages, nextMaxOutputTokens still uses audio ceilings above.
 */
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
 * Per-turn max_output_tokens for Realtime (audio-token scale).
 * Prompt instructions enforce short turns; this ceiling only prevents runaway
 * generation — never mid-sentence truncation of a normal coaching beat.
 */
export function outputBudgetForTurn(
  kind: VoiceTurnKind,
  conciseMode: boolean
): number {
  const c = REALTIME_TOKEN_CEILINGS;
  if (conciseMode) {
    if (kind === "opening" || kind === "closing") {
      return c.CONCISE_OPENING_MAX_TOKENS;
    }
    if (kind === "complex") return c.CONCISE_TURN_MAX_TOKENS + 100;
    return c.CONCISE_TURN_MAX_TOKENS;
  }
  switch (kind) {
    case "opening":
      return c.SESSION_OPENING_MAX_TOKENS;
    case "quick_followup":
      return c.QUICK_FOLLOWUP_MAX_TOKENS;
    case "complex":
      return c.COMPLEX_TURN_MAX_TOKENS;
    case "closing":
      return c.CLOSING_MAX_TOKENS;
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
ECONOMIC CADENCE (active): Prefer shorter spoken turns — usually 1–2 short sentences — then yield.
Finish the thought completely — never stop mid-sentence.
Forge still owns conversational judgment (acknowledge / clarify / teach lightly / challenge / prompt).
No frameworks. No monologues. Member airtime first. Practice over lecture.
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
