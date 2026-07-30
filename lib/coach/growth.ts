import { computeStreakDays } from "@/lib/coach/metrics";
import type {
  GrowthSummary,
  SessionReport,
  SkillKey,
} from "@/lib/coach/types";

const SKILL_KEYS: SkillKey[] = [
  "confidence",
  "empathy",
  "listening",
  "clarity",
  "storytelling",
  "negotiation",
  "leadership",
];

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Aggregate permanent session reports into Progress / growth metrics.
 */
export function buildGrowthSummary(reports: SessionReport[]): GrowthSummary {
  if (reports.length === 0) {
    return {
      sessionsCompleted: 0,
      averageScore: 0,
      hoursPracticed: 0,
      longestConversationSeconds: 0,
      bestScore: 0,
      streakDays: 0,
      averageFillerWords: 0,
      averageSpeakingPaceWpm: null,
      skills: {
        confidence: 0,
        empathy: 0,
        listening: 0,
        clarity: 0,
        storytelling: 0,
        negotiation: 0,
        leadership: 0,
      },
      trend30d: [],
      adaptiveInsight: null,
      lastSessionAt: null,
      lastScenarioTitle: null,
    };
  }

  const sorted = [...reports].sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)
  );

  const scores = sorted
    .map((r) => r.overallScore)
    .filter((n): n is number => typeof n === "number");

  const durations = sorted
    .map((r) => r.durationSeconds)
    .filter((n): n is number => typeof n === "number" && n > 0);

  const skills = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) {
    const values = sorted
      .map((r) => r[key])
      .filter((n): n is number => typeof n === "number");
    skills[key] = average(values);
  }

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = sorted.filter((r) => {
    const t = Date.parse(r.completedAt ?? r.createdAt);
    return Number.isFinite(t) && t >= cutoff;
  });

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const report of last30) {
    const day = (report.completedAt ?? report.createdAt).slice(0, 10);
    const score = report.overallScore ?? 0;
    const cur = byDay.get(day) ?? { sum: 0, count: 0 };
    cur.sum += score;
    cur.count += 1;
    byDay.set(day, cur);
  }

  const trend30d = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      averageScore: Math.round(sum / count),
      sessions: count,
    }));

  const latest = sorted[0];
  const adaptiveInsight = buildAdaptiveInsight(sorted);

  return {
    sessionsCompleted: sorted.length,
    averageScore: average(scores),
    hoursPracticed: Math.round((durations.reduce((a, b) => a + b, 0) / 3600) * 10) / 10,
    longestConversationSeconds: durations.length ? Math.max(...durations) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    streakDays: computeStreakDays(
      sorted.map((r) => r.completedAt ?? r.createdAt)
    ),
    averageFillerWords: average(sorted.map((r) => r.fillerWords)),
    averageSpeakingPaceWpm: null,
    skills,
    trend30d,
    adaptiveInsight,
    lastSessionAt: latest.completedAt ?? latest.createdAt,
    lastScenarioTitle: latest.scenarioTitle ?? null,
  };
}

/** Coach-evolving insight from recent history (Priority #5). */
export function buildAdaptiveInsight(reports: SessionReport[]): string | null {
  if (reports.length < 2) return null;

  const sorted = [...reports].sort((a, b) =>
    (a.completedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.createdAt)
  );

  const recent = sorted.slice(-5);
  const older = sorted.slice(0, Math.max(0, sorted.length - 5));

  const recentConf = average(
    recent.map((r) => r.confidence).filter((n): n is number => typeof n === "number")
  );
  const olderConf = average(
    older
      .map((r) => r.confidence)
      .filter((n): n is number => typeof n === "number")
  );

  const recentEmpathy = average(
    recent.map((r) => r.empathy).filter((n): n is number => typeof n === "number")
  );
  const olderEmpathy = average(
    older.map((r) => r.empathy).filter((n): n is number => typeof n === "number")
  );

  const recentInterruptions = average(recent.map((r) => r.interruptions));
  const olderInterruptions = average(
    older.length ? older.map((r) => r.interruptions) : recent.map((r) => r.interruptions)
  );

  if (older.length > 0 && recentInterruptions < olderInterruptions - 0.5) {
    return `You've been interrupting less over the last ${recent.length} sessions — keep that space open for the other person.`;
  }

  if (older.length > 0 && recentEmpathy > olderEmpathy + 3) {
    return `Your empathy score has been climbing across recent sessions. That warmth is becoming a strength.`;
  }

  if (older.length > 0 && recentConf > olderConf + 5) {
    return `Your confidence has risen from about ${olderConf} to ${recentConf} across recent practice. That is real growth.`;
  }

  // Scenario avoidance signal
  const titles = sorted.map((r) => (r.scenarioTitle ?? "").toLowerCase());
  const presentationHeavy = titles.filter(
    (t) => t.includes("story") || t.includes("interview") || t.includes("present")
  ).length;
  const conflictSparse = titles.filter(
    (t) => t.includes("difficult") || t.includes("conflict") || t.includes("negotiat")
  ).length;

  if (sorted.length >= 4 && presentationHeavy >= 3 && conflictSparse === 0) {
    return `You've practiced presentations and interviews often, but haven't revisited conflict or negotiation recently. Want to stretch there today?`;
  }

  if (sorted.length >= 6) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const early = average(
      firstHalf
        .map((r) => r.overallScore)
        .filter((n): n is number => typeof n === "number")
    );
    const late = average(
      secondHalf
        .map((r) => r.overallScore)
        .filter((n): n is number => typeof n === "number")
    );
    if (late > early + 8) {
      return `Looking across your history: early sessions averaged around ${early}; recent ones average ${late}. The practice is compounding.`;
    }
  }

  return null;
}
