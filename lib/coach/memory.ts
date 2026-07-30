import { buildAdaptiveInsight } from "@/lib/coach/growth";
import type {
  CoachMemory,
  CoachPromptContext,
  SessionReport,
} from "@/lib/coach/types";

export function emptyCoachMemory(userId: string, displayName = ""): CoachMemory {
  return {
    userId,
    displayName,
    occupation: "",
    communicationGoals: [],
    biggestFears: [],
    recentWins: [],
    topicsWorkingOn: [],
    preferredCoachingStyle: "",
    confidenceLevel: null,
    speakingHabits: [],
    favoriteScenarios: [],
    pastExercises: [],
    notes: {},
    lastSessionId: null,
    lastSessionSummary: "",
    lastScenarioTitle: "",
    sessionsCompleted: 0,
    updatedAt: new Date().toISOString(),
  };
}

function firstName(displayName: string): string {
  const part = displayName.trim().split(/\s+/)[0];
  return part || "there";
}

function uniqPush(list: string[], value: string, max = 8): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = [trimmed, ...list.filter((item) => item !== trimmed)];
  return next.slice(0, max);
}

/**
 * Merge a completed session report into relationship memory.
 * Keeps only facts that improve the next conversation.
 */
export function applyReportToMemory(
  memory: CoachMemory,
  report: SessionReport,
  displayName?: string
): CoachMemory {
  const scenario = report.scenarioTitle?.trim() || memory.lastScenarioTitle;
  return {
    ...memory,
    displayName: displayName?.trim() || memory.displayName,
    recentWins: uniqPush(memory.recentWins, report.breakthrough),
    topicsWorkingOn: uniqPush(
      memory.topicsWorkingOn,
      report.biggestWeakness
    ),
    favoriteScenarios: uniqPush(memory.favoriteScenarios, scenario),
    pastExercises: uniqPush(memory.pastExercises, scenario, 12),
    confidenceLevel: report.confidence ?? memory.confidenceLevel,
    speakingHabits: uniqPush(
      memory.speakingHabits,
      inferHabitFromReport(report),
      6
    ),
    lastSessionId: report.sessionId,
    lastSessionSummary: report.coachSummary.slice(0, 400),
    lastScenarioTitle: scenario,
    sessionsCompleted: Math.max(memory.sessionsCompleted + 1, report.sessionNumber),
    updatedAt: new Date().toISOString(),
  };
}

function inferHabitFromReport(report: SessionReport): string {
  if (report.fillerWords >= 5) {
    return "Uses filler words when thinking under pressure";
  }
  if (report.interruptions >= 3) {
    return "Tends to jump in quickly — may cut space short";
  }
  if (report.questionsAsked >= 3) {
    return "Asks clarifying questions when engaged";
  }
  if (
    (report.clarity ?? 0) < 60 &&
    (report.confidence ?? 0) >= 65
  ) {
    return "Leans toward explaining before checking understanding";
  }
  return "";
}

/**
 * Build a short, human welcome hint — curiosity first, never a topic menu.
 */
export function buildWelcomeHint(input: {
  firstName: string;
  isReturning: boolean;
  lastScenarioTitle: string;
  recentWin?: string;
  speakingHabit?: string;
  adaptiveInsight?: string | null;
}): string {
  const { firstName, isReturning } = input;

  if (!isReturning) {
    return `Say hello to ${firstName === "there" ? "them" : firstName} warmly. One short sentence that they're safe here — no performance. Ask one simple curious question about what brought them in. Then wait.`;
  }

  const name = firstName === "there" ? "there" : firstName;
  const pattern =
    input.adaptiveInsight?.trim() ||
    input.speakingHabit?.trim() ||
    "";
  const last = input.lastScenarioTitle.trim();

  if (pattern) {
    return `Welcome back, ${name}. In 2–3 short sentences: notice one pattern (${pattern}). Do not lecture. Do not offer a menu of topics. End with one curious question about what they'd like to sit with today. Then wait.`;
  }

  if (last) {
    return `Welcome back, ${name}. Briefly remember last time (${last}) in one calm sentence — no score recap, no topic menu. Ask one curious question about what's on their mind today. 2–3 short sentences max. Then wait.`;
  }

  return `Welcome back, ${name}. One warm sentence that you remember them. Ask one curious question about what's present today. No options list. Then wait.`;
}

export function buildCoachPromptContext(
  memory: CoachMemory | null,
  recentReports: SessionReport[] = []
): CoachPromptContext {
  const mem = memory ?? emptyCoachMemory("unknown");
  const name = firstName(mem.displayName);
  const isReturning = mem.sessionsCompleted > 0 || recentReports.length > 0;
  const adaptiveInsight = buildAdaptiveInsight(recentReports);

  const welcomeHint = buildWelcomeHint({
    firstName: name,
    isReturning,
    lastScenarioTitle: mem.lastScenarioTitle,
    recentWin: mem.recentWins[0],
    speakingHabit: mem.speakingHabits[0],
    adaptiveInsight,
  });

  return {
    firstName: name,
    isReturning,
    sessionsCompleted: mem.sessionsCompleted || recentReports.length,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionSummary: mem.lastSessionSummary,
    recentWins: mem.recentWins.slice(0, 3),
    topicsWorkingOn: mem.topicsWorkingOn.slice(0, 3),
    communicationGoals: mem.communicationGoals.slice(0, 3),
    biggestFears: mem.biggestFears.slice(0, 3),
    preferredCoachingStyle: mem.preferredCoachingStyle,
    confidenceLevel: mem.confidenceLevel,
    speakingHabits: mem.speakingHabits.slice(0, 3),
    adaptiveInsight,
    welcomeHint,
  };
}

/** Compact block injected into system / coach prompts. */
export function formatCoachMemoryBlock(ctx: CoachPromptContext): string {
  if (!ctx.isReturning) {
    return `
Member relationship memory:
- First saved session for ${ctx.firstName}.
- Opening style: ${ctx.welcomeHint}
- Remember: understand before coaching. No topic menus.
`;
  }

  return `
Member relationship memory (use this — do not pretend you just met them):
- Name: ${ctx.firstName}
- Sessions completed: ${ctx.sessionsCompleted}
- Last scenario: ${ctx.lastScenarioTitle || "(unknown)"}
- Last summary: ${ctx.lastSessionSummary || "(none)"}
- Patterns / habits noticed: ${ctx.speakingHabits.join("; ") || "(none yet)"}
- Recent wins (celebrate lightly, don't oversell): ${ctx.recentWins.join("; ") || "(none yet)"}
- Soft focus areas (do NOT recite as a checklist): ${ctx.topicsWorkingOn.join("; ") || "(none yet)"}
- Goals: ${ctx.communicationGoals.join("; ") || "(not set)"}
- Fears to handle gently: ${ctx.biggestFears.join("; ") || "(not set)"}
- Preferred coaching style: ${ctx.preferredCoachingStyle || "warm, curious, unhurried"}
- Confidence level (approx): ${ctx.confidenceLevel ?? "unknown"}
- Pattern insight (use once, gently — never as a lecture): ${ctx.adaptiveInsight || "(none)"}
- Opening style: ${ctx.welcomeHint}
`;
}
