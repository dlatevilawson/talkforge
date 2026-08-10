/**
 * Assessment Flow test slice — types + readiness helpers.
 * Narrow: conversation capture + LP write only (no training plan / missions).
 */

export type ProfileSource = "quick_pick" | "assessment" | "incomplete";

/** Inferred 1–10 scores from assessment conversation content alone. */
export type PresenceScores = {
  clarity: number;
  composure: number;
  confidence: number;
  listening: number;
  assertiveness: number;
  presence: number;
};

export const PRESENCE_SCORE_KEYS = [
  "clarity",
  "composure",
  "confidence",
  "listening",
  "assertiveness",
  "presence",
] as const;

export type AssessmentExtraction = {
  goals: string[];
  strengths: string[];
  challenges: string[];
  presenceScores: PresenceScores | null;
  /** True when at least one clear goal AND one clear challenge surfaced. */
  ready: boolean;
  corePattern?: string;
  /**
   * True when the member disengaged / expressed process confusion enough that
   * we must not force a profile (e.g. two consecutive confusion answers).
   */
  abortedForDisengagement?: boolean;
  /** Count of user answers flagged as process confusion / disengagement. */
  confusionAnswerCount?: number;
};

/** Lightweight heuristic for process-confusion / disengagement answers. */
export function looksLikeProcessConfusion(text: string): boolean {
  // Normalize curly apostrophes / quotes so spoken transcripts still match.
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'");
  if (!t) return false;
  const signals = [
    "why are you asking",
    "why are we",
    "what is this for",
    "what's this for",
    "whats this for",
    "don't understand why",
    "do not understand why",
    "dont understand why",
    "not sure what this",
    "not sure why",
    "what are we doing",
    "why these questions",
    "what is the point",
    "what's the point",
    "i don't get why",
    "i dont get why",
    "confused about this",
    "don't see the point",
    "dont see the point",
    "skip this",
    "can we just practice",
    "rather just practice",
  ];
  return signals.some((s) => t.includes(s));
}

/**
 * Count consecutive trailing user answers that look like process confusion.
 * Used to force incomplete when ≥2 in a row.
 */
export function countTrailingConfusionAnswers(userTexts: string[]): number {
  let count = 0;
  for (let i = userTexts.length - 1; i >= 0; i -= 1) {
    if (!looksLikeProcessConfusion(userTexts[i]!)) break;
    count += 1;
  }
  return count;
}

export function countConfusionAnswers(userTexts: string[]): number {
  return userTexts.filter((t) => looksLikeProcessConfusion(t)).length;
}

/** Drop answers that are process confusion so they never become goals/challenges. */
export function filterSubstantiveAnswers(userTexts: string[]): string[] {
  return userTexts.filter((t) => !looksLikeProcessConfusion(t));
}

export function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function normalizeStringList(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().replace(/\s+/g, " ");
    if (!trimmed || trimmed.length < 3) continue;
    out.push(trimmed.slice(0, 180));
    if (out.length >= max) break;
  }
  return out;
}

/** Readiness: ≥1 clear goal and ≥1 clear challenge. */
export function isAssessmentReady(
  goals: string[],
  challenges: string[]
): boolean {
  return goals.length >= 1 && challenges.length >= 1;
}

export function normalizePresenceScores(
  value: unknown
): PresenceScores | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const scores: Partial<PresenceScores> = {};
  for (const key of PRESENCE_SCORE_KEYS) {
    const n = clampScore(row[key]);
    if (n == null) return null;
    scores[key] = n;
  }
  return scores as PresenceScores;
}

export function emptyPresenceScores(): PresenceScores {
  return {
    clarity: 5,
    composure: 5,
    confidence: 5,
    listening: 5,
    assertiveness: 5,
    presence: 5,
  };
}
