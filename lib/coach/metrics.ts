import type { ConversationTurn, ForgeCoaching } from "@/lib/types";
import type { SkillKey } from "@/lib/coach/types";

const FILLER_PATTERN =
  /\b(um+|uh+|like|you know|kinda|sort of|basically|literally|right\?)\b/gi;

const QUESTION_PATTERN = /\?/g;

/**
 * Light speech-habit heuristics from transcript text.
 * Not clinical — directional signals for the session report.
 */
export function analyzeTranscriptText(texts: string[]): {
  questionsAsked: number;
  fillerWords: number;
  interruptions: number;
  wordCount: number;
  estimatedWpm: number | null;
  durationHintSeconds: number | null;
} {
  let questionsAsked = 0;
  let fillerWords = 0;
  let wordCount = 0;

  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    questionsAsked += (trimmed.match(QUESTION_PATTERN) ?? []).length;
    fillerWords += (trimmed.match(FILLER_PATTERN) ?? []).length;
    wordCount += trimmed.split(/\s+/).filter(Boolean).length;
  }

  // Crude interruption proxy: very short overlapping-style user turns.
  const interruptions = texts.filter((t) => {
    const words = t.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 && words.length <= 2;
  }).length;

  return {
    questionsAsked,
    fillerWords,
    interruptions,
    wordCount,
    estimatedWpm: null,
    durationHintSeconds: null,
  };
}

export function averageDimension(
  turns: ConversationTurn[],
  key: keyof Pick<
    ForgeCoaching,
    "score" | "clarity" | "confidence" | "warmth" | "curiosity"
  >
): number | null {
  const values = turns
    .filter(
      (turn): turn is { role: "forge"; coaching: ForgeCoaching } =>
        turn.role === "forge"
    )
    .map((turn) => turn.coaching[key])
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Map Forge dimensions → growth skill keys. */
export function skillsFromForgeAverages(input: {
  confidence: number | null;
  warmth: number | null;
  curiosity: number | null;
  clarity: number | null;
  overall: number | null;
  scenarioId?: string;
}): Partial<Record<SkillKey, number | null>> {
  const scenario = (input.scenarioId ?? "").toLowerCase();
  const base = input.overall ?? input.confidence ?? input.clarity;

  return {
    confidence: input.confidence,
    empathy: input.warmth,
    listening: input.curiosity,
    clarity: input.clarity,
    storytelling:
      scenario.includes("story") || scenario.includes("behavioral")
        ? base
        : null,
    negotiation: scenario.includes("negotiat") ? base : null,
    leadership:
      scenario.includes("leader") || scenario.includes("difficult")
        ? base
        : null,
  };
}

export function clampScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeStreakDays(completedAtDates: string[]): number {
  if (completedAtDates.length === 0) return 0;

  const days = new Set(
    completedAtDates.map((iso) => iso.slice(0, 10)).filter(Boolean)
  );
  const sorted = [...days].sort().reverse();
  if (sorted.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(`${sorted[0]}T00:00:00`);
  const diffDays = Math.round(
    (today.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000)
  );
  // Streak counts if last practice was today or yesterday
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const cur = new Date(`${sorted[i]}T00:00:00`);
    const gap = Math.round(
      (prev.getTime() - cur.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (gap === 1) streak += 1;
    else break;
  }
  return streak;
}
