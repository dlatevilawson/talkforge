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
};

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
