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
      report.fillerWords >= 5
        ? "Tends to use filler words when thinking"
        : report.questionsAsked >= 3
          ? "Asks clarifying questions"
          : "",
      6
    ),
    lastSessionId: report.sessionId,
    lastSessionSummary: report.coachSummary.slice(0, 400),
    lastScenarioTitle: scenario,
    sessionsCompleted: Math.max(memory.sessionsCompleted + 1, report.sessionNumber),
    updatedAt: new Date().toISOString(),
  };
}

export function buildCoachPromptContext(
  memory: CoachMemory | null,
  recentReports: SessionReport[] = []
): CoachPromptContext {
  const mem = memory ?? emptyCoachMemory("unknown");
  const name = firstName(mem.displayName);
  const isReturning = mem.sessionsCompleted > 0 || recentReports.length > 0;
  const adaptiveInsight = buildAdaptiveInsight(recentReports);

  let welcomeHint: string;
  if (!isReturning) {
    welcomeHint = `Welcome them warmly as Forge. This is their first saved practice. Keep it short and inviting.`;
  } else {
    const last = mem.lastScenarioTitle
      ? `Last time you practiced ${mem.lastScenarioTitle}.`
      : `You've practiced with me before.`;
    const win = mem.recentWins[0]
      ? ` Call out this recent win briefly: ${mem.recentWins[0]}`
      : "";
    const focus = mem.topicsWorkingOn[0]
      ? ` Offer to continue working on: ${mem.topicsWorkingOn[0]}`
      : " Invite them to choose today's focus.";
    welcomeHint = `Welcome back, ${name}. ${last}${win}${focus} Do not restart like a stranger. Sound like their coach who remembers.`;
  }

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
`;
  }

  return `
Member relationship memory (use this — do not pretend you just met them):
- Name: ${ctx.firstName}
- Sessions completed: ${ctx.sessionsCompleted}
- Last scenario: ${ctx.lastScenarioTitle || "(unknown)"}
- Last summary: ${ctx.lastSessionSummary || "(none)"}
- Recent wins: ${ctx.recentWins.join("; ") || "(none yet)"}
- Topics in progress: ${ctx.topicsWorkingOn.join("; ") || "(none yet)"}
- Goals: ${ctx.communicationGoals.join("; ") || "(not set)"}
- Fears to handle gently: ${ctx.biggestFears.join("; ") || "(not set)"}
- Speaking habits: ${ctx.speakingHabits.join("; ") || "(none noted)"}
- Preferred coaching style: ${ctx.preferredCoachingStyle || "warm and direct"}
- Confidence level (approx): ${ctx.confidenceLevel ?? "unknown"}
- Adaptive insight: ${ctx.adaptiveInsight || "(none)"}
- Opening style: ${ctx.welcomeHint}
`;
}
