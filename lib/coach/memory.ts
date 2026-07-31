import { buildAdaptiveInsight } from "@/lib/coach/growth";
import type {
  CoachMemory,
  CoachPromptContext,
  LearningStyle,
  SessionReport,
} from "@/lib/coach/types";

export function emptyCoachMemory(userId: string, displayName = ""): CoachMemory {
  return {
    userId,
    displayName,
    preferredNickname: "",
    occupation: "",
    communicationGoals: [],
    longTermChallenges: [],
    biggestFears: [],
    recentWins: [],
    topicsWorkingOn: [],
    preferredCoachingStyle: "",
    learningStyle: "",
    confidenceLevel: null,
    biggestStrength: "",
    speakingHabits: [],
    emotionalTriggers: [],
    favoriteScenarios: [],
    pastExercises: [],
    notes: {},
    lastSessionId: null,
    lastSessionSummary: "",
    lastScenarioTitle: "",
    lastSessionAt: null,
    sessionsCompleted: 0,
    updatedAt: new Date().toISOString(),
  };
}

function firstName(displayName: string): string {
  const part = displayName.trim().split(/\s+/)[0];
  return part || "there";
}

function preferredName(memory: CoachMemory): string {
  const nick = memory.preferredNickname.trim();
  if (nick) return nick;
  return firstName(memory.displayName);
}

function uniqPush(list: string[], value: string, max = 8): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = [trimmed, ...list.filter((item) => item !== trimmed)];
  return next.slice(0, max);
}

function relativeSessionPhrase(iso: string | null | undefined): string {
  if (!iso) return "Last time";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Last time";
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Earlier today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  if (days < 14) return "Last week";
  if (days < 45) return "Last month";
  return "Last time we practiced";
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
    biggestStrength:
      report.breakthrough.trim() || memory.biggestStrength,
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
    lastSessionAt: report.completedAt ?? report.createdAt,
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
 * Forge Law #012 — continuity opening.
 * Target feel:
 * "Last week you wanted to become more confident speaking to your manager.
 *  You slowed your pace, but you still rushed when challenged.
 *  Want to keep working there, or is there something new on your mind today?"
 */
export function buildWelcomeHint(input: {
  name: string;
  isReturning: boolean;
  lastScenarioTitle: string;
  lastSessionAt?: string | null;
  lastStruggle?: string;
  recentWin?: string;
  speakingHabit?: string;
  adaptiveInsight?: string | null;
  longTermChallenge?: string;
  communicationGoal?: string;
}): string {
  const { name, isReturning } = input;

  if (!isReturning) {
    return `Say hello to ${name === "there" ? "them" : name} warmly. One short sentence that they're safe here — no performance. Ask one simple curious question about why they're here. Then wait. Never ask a blank menu of practice topics.`;
  }

  const when = relativeSessionPhrase(input.lastSessionAt);
  const goal =
    input.communicationGoal?.trim() ||
    input.longTermChallenge?.trim() ||
    "";
  const struggle = input.lastStruggle?.trim() || "";
  const win = input.recentWin?.trim() || "";
  const pattern =
    input.adaptiveInsight?.trim() ||
    input.speakingHabit?.trim() ||
    "";

  // Full Law #012 shape: goal + progress/struggle + open choice
  if (goal && (struggle || pattern || win)) {
    const observed =
      struggle ||
      pattern ||
      (win ? `you made progress: ${win}` : "");
    return `Forge Law #012 continuity. Welcome back, ${name}. In 3 short sentences, speak like this (adapt to facts — do not invent numbers): "${when} you wanted to work on ${goal}. ${observed}. Want to keep working there, or is there something new on your mind today?" Never ask "What would you like to practice today?" as a blank menu. Then wait.`;
  }

  if (struggle) {
    return `Forge Law #012. Welcome back, ${name}. Continuity: "${when} you were working on ${struggle}. Want to keep going there, or is something else on your mind?" No topic menu. Then wait.`;
  }

  if (pattern) {
    return `Forge Law #012. Welcome back, ${name}. Gently notice one pattern (${pattern}). Offer one open choice to continue or shift. No lecture. No topic menu. Then wait.`;
  }

  const last = input.lastScenarioTitle.trim();
  if (last) {
    return `Forge Law #012. Welcome back, ${name}. ${when} you practiced ${last}. One calm continuity sentence, then: keep going there, or something new on your mind? No blank menu. Then wait.`;
  }

  return `Forge Law #012. Welcome back, ${name}. One warm sentence that you remember them. Ask whether they want to continue recent work or something new is on their mind. No options list of skills. Then wait.`;
}

export function buildCoachPromptContext(
  memory: CoachMemory | null,
  recentReports: SessionReport[] = []
): CoachPromptContext {
  const mem = memory ?? emptyCoachMemory("unknown");
  const name = preferredName(mem);
  const isReturning = mem.sessionsCompleted > 0 || recentReports.length > 0;
  const adaptiveInsight = buildAdaptiveInsight(recentReports);
  const lastReport = recentReports[0];
  const lastSessionAt =
    mem.lastSessionAt ||
    lastReport?.completedAt ||
    lastReport?.createdAt ||
    null;

  const welcomeHint = buildWelcomeHint({
    name,
    isReturning,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionAt,
    lastStruggle: mem.topicsWorkingOn[0] || lastReport?.biggestWeakness,
    recentWin: mem.recentWins[0] || mem.biggestStrength,
    speakingHabit: mem.speakingHabits[0],
    adaptiveInsight,
    longTermChallenge: mem.longTermChallenges[0],
    communicationGoal: mem.communicationGoals[0],
  });

  return {
    firstName: name,
    nickname: mem.preferredNickname.trim(),
    isReturning,
    sessionsCompleted: mem.sessionsCompleted || recentReports.length,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionSummary: mem.lastSessionSummary,
    lastSessionAt,
    recentWins: mem.recentWins.slice(0, 3),
    topicsWorkingOn: mem.topicsWorkingOn.slice(0, 3),
    communicationGoals: mem.communicationGoals.slice(0, 3),
    longTermChallenges: mem.longTermChallenges.slice(0, 3),
    biggestFears: mem.biggestFears.slice(0, 3),
    emotionalTriggers: mem.emotionalTriggers.slice(0, 3),
    preferredCoachingStyle: mem.preferredCoachingStyle,
    learningStyle: mem.learningStyle,
    confidenceLevel: mem.confidenceLevel,
    biggestStrength: mem.biggestStrength,
    speakingHabits: mem.speakingHabits.slice(0, 3),
    adaptiveInsight,
    welcomeHint,
  };
}

const LEARNING_STYLE_LABELS: Record<Exclude<LearningStyle, "">, string> = {
  practice_first: "learns by practicing first",
  reflect_first: "prefers a moment to reflect before diving in",
  example_first: "learns best from a short example",
  challenge_first: "likes a gentle stretch sooner",
};

/** Compact block injected into system / coach prompts. */
export function formatCoachMemoryBlock(ctx: CoachPromptContext): string {
  const learning =
    ctx.learningStyle && ctx.learningStyle in LEARNING_STYLE_LABELS
      ? LEARNING_STYLE_LABELS[ctx.learningStyle as Exclude<LearningStyle, "">]
      : "(not set)";

  if (!ctx.isReturning) {
    return `
Member relationship memory:
- First saved session for ${ctx.firstName}.
- Nickname: ${ctx.nickname || "(none)"}
- Opening style: ${ctx.welcomeHint}
- Learning style: ${learning}
- Remember: understand before coaching. No topic menus.
`;
  }

  return `
Member relationship memory (use this — do not pretend you just met them):
- Call them: ${ctx.firstName}${ctx.nickname ? ` (nickname: ${ctx.nickname})` : ""}
- Sessions completed: ${ctx.sessionsCompleted}
- Last scenario: ${ctx.lastScenarioTitle || "(unknown)"}
- Last practiced: ${ctx.lastSessionAt || "(unknown)"}
- Last summary: ${ctx.lastSessionSummary || "(none)"}
- Biggest strength: ${ctx.biggestStrength || "(none yet)"}
- Patterns / habits: ${ctx.speakingHabits.join("; ") || "(none yet)"}
- Recent wins: ${ctx.recentWins.join("; ") || "(none yet)"}
- Soft focus / last struggle (do NOT recite as a checklist): ${ctx.topicsWorkingOn.join("; ") || "(none yet)"}
- Long-term challenges: ${ctx.longTermChallenges.join("; ") || "(not set)"}
- Communication goals: ${ctx.communicationGoals.join("; ") || "(not set)"}
- Emotional triggers (handle gently): ${ctx.emotionalTriggers.join("; ") || ctx.biggestFears.join("; ") || "(not set)"}
- Preferred coaching style: ${ctx.preferredCoachingStyle || "warm, curious, unhurried"}
- Learning style: ${learning}
- Confidence level (approx): ${ctx.confidenceLevel ?? "unknown"}
- Pattern insight: ${ctx.adaptiveInsight || "(none)"}
- Opening style: ${ctx.welcomeHint}
`;
}

/** Parse comma/newline lists from Settings forms. */
export function parseMemoryList(value: string, max = 8): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}
