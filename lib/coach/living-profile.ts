import type { CoachMemory, SessionReport } from "@/lib/coach/types";

export type LivingCoachProfile = {
  name: string;
  sessionsCompleted: number;
  strengths: string[];
  growthAreas: string[];
  motivators: string[];
  knownPatterns: string[];
  emotionalNotes: string[];
  preferredCoachingStyle: string;
  learningStyle: string;
  longTermGoal: string;
  lastSessionInsight: string;
  /** One-line status of the relationship */
  relationshipLine: string;
};

function uniq(list: string[], max = 6): string[] {
  const out: string[] = [];
  for (const item of list) {
    const t = item.trim();
    if (!t) continue;
    if (out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function synthesizeStrengths(
  memory: CoachMemory | null,
  reports: SessionReport[]
): string[] {
  const fromMemory = memory?.communicationStrengths ?? [];
  const fromReports = reports
    .map((r) => r.breakthrough)
    .filter(Boolean)
    .slice(0, 4);
  const skillHints: string[] = [];
  const withStory = reports.filter(
    (r) => typeof r.storytelling === "number" && r.storytelling >= 70
  ).length;
  if (withStory >= 2) skillHints.push("Comes alive when telling personal stories");
  const highListen = reports.filter(
    (r) => typeof r.listening === "number" && r.listening >= 70
  ).length;
  if (highListen >= 2) skillHints.push("Strong curiosity — asks clarifying questions");
  const calm = reports.filter(
    (r) =>
      typeof r.confidence === "number" &&
      r.confidence >= 65 &&
      r.fillerWords <= 3
  ).length;
  if (calm >= 2) skillHints.push("Can sound calm when the topic is grounded");
  if (memory?.biggestStrength) skillHints.unshift(memory.biggestStrength);
  return uniq([...fromMemory, ...skillHints, ...fromReports], 5);
}

function synthesizeGrowth(
  memory: CoachMemory | null,
  reports: SessionReport[]
): string[] {
  const fromMemory = [
    ...(memory?.growthAreas ?? []),
    ...(memory?.topicsWorkingOn ?? []),
    ...(memory?.longTermChallenges ?? []),
  ];
  const fromReports = reports
    .map((r) => r.biggestWeakness)
    .filter(Boolean)
    .slice(0, 4);
  const habitHints = memory?.speakingHabits ?? [];
  return uniq([...fromMemory, ...habitHints, ...fromReports], 5);
}

/**
 * Build a human living profile — not a settings form, not a scorecard.
 * "What Forge knows about you."
 */
export function buildLivingCoachProfile(
  memory: CoachMemory | null,
  reports: SessionReport[]
): LivingCoachProfile {
  const name =
    memory?.preferredNickname?.trim() ||
    memory?.displayName?.trim().split(/\s+/)[0] ||
    "you";
  const sessions =
    memory?.sessionsCompleted ||
    reports.length ||
    0;

  const strengths = synthesizeStrengths(memory, reports);
  const growthAreas = synthesizeGrowth(memory, reports);
  const motivators = uniq(
    [
      ...(memory?.motivators ?? []),
      ...(memory?.communicationGoals ?? []),
    ],
    4
  );
  const knownPatterns = uniq(
    [
      ...(memory?.knownPatterns ?? []),
      ...(memory?.speakingHabits ?? []),
      ...reports.map((r) => r.patternNoticed).filter(Boolean),
    ],
    5
  );
  const emotionalNotes = uniq(
    [
      ...(memory?.emotionalNotes ?? []),
      ...reports.map((r) => r.emotionalNote).filter(Boolean),
    ],
    5
  );

  const lastInsight =
    memory?.lastSessionInsight?.trim() ||
    reports[0]?.sessionInsight?.trim() ||
    "";

  let relationshipLine: string;
  if (sessions === 0) {
    relationshipLine = "Forge is just getting to know you.";
  } else if (sessions < 3) {
    relationshipLine = `Early relationship — ${sessions} session${sessions === 1 ? "" : "s"} together. Continuity is starting.`;
  } else if (sessions < 10) {
    relationshipLine = `Growing relationship — Forge is beginning to notice your patterns.`;
  } else {
    relationshipLine = `Deepening relationship — Forge is learning who you're becoming.`;
  }

  const learningLabels: Record<string, string> = {
    practice_first: "Learns by doing",
    reflect_first: "Prefers to reflect before diving in",
    example_first: "Learns best from short examples",
    challenge_first: "Likes a gentle stretch sooner",
  };

  return {
    name,
    sessionsCompleted: sessions,
    strengths,
    growthAreas,
    motivators,
    knownPatterns,
    emotionalNotes,
    preferredCoachingStyle:
      memory?.preferredCoachingStyle?.trim() || "Gentle questions · short feedback",
    learningStyle: memory?.learningStyle
      ? learningLabels[memory.learningStyle] || memory.learningStyle
      : "",
    longTermGoal: memory?.longTermGoal?.trim() || "",
    lastSessionInsight: lastInsight,
    relationshipLine,
  };
}
