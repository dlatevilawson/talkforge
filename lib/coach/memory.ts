import { buildAdaptiveInsight } from "@/lib/coach/growth";
import {
  buildPurposePromptHints,
  emptyPurposeFields,
  extractCommitmentFromReport,
  formatPurposeMemoryBlock,
  mergeCommitment,
} from "@/lib/coach/purpose";
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
    communicationStrengths: [],
    growthAreas: [],
    motivators: [],
    knownPatterns: [],
    emotionalNotes: [],
    longTermGoal: "",
    lastSessionInsight: "",
    ...emptyPurposeFields(),
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

function coachingMaturity(
  sessions: number
): CoachPromptContext["coachingMaturity"] {
  if (sessions >= 10) return "deep";
  if (sessions >= 3) return "familiar";
  return "new";
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
  const extracted = extractCommitmentFromReport(report);
  return {
    ...memory,
    displayName: displayName?.trim() || memory.displayName,
    recentWins: uniqPush(memory.recentWins, report.breakthrough),
    topicsWorkingOn: uniqPush(
      memory.topicsWorkingOn,
      report.biggestWeakness
    ),
    growthAreas: uniqPush(memory.growthAreas, report.biggestWeakness, 6),
    communicationStrengths: uniqPush(
      memory.communicationStrengths,
      report.breakthrough,
      6
    ),
    biggestStrength:
      report.breakthrough.trim() || memory.biggestStrength,
    knownPatterns: uniqPush(
      memory.knownPatterns,
      report.patternNoticed || inferHabitFromReport(report),
      8
    ),
    emotionalNotes: uniqPush(
      memory.emotionalNotes,
      report.emotionalNote,
      8
    ),
    favoriteScenarios: uniqPush(memory.favoriteScenarios, scenario),
    pastExercises: uniqPush(memory.pastExercises, scenario, 12),
    confidenceLevel: report.confidence ?? memory.confidenceLevel,
    speakingHabits: uniqPush(
      memory.speakingHabits,
      inferHabitFromReport(report),
      6
    ),
    commitments: mergeCommitment(memory.commitments, extracted),
    lastSessionInsight:
      report.sessionInsight.trim() || memory.lastSessionInsight,
    lastSessionId: report.sessionId,
    lastSessionSummary: report.coachSummary.slice(0, 400),
    lastScenarioTitle: scenario,
    lastSessionAt: report.completedAt ?? report.createdAt,
    sessionsCompleted: Math.max(memory.sessionsCompleted + 1, report.sessionNumber),
    updatedAt: new Date().toISOString(),
  };
}

function inferHabitFromReport(report: SessionReport): string {
  if (report.patternNoticed.trim()) return report.patternNoticed.trim();
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
 * Forge Law #012 — continuity opening, with optional Phase 8 purpose overlays.
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
  northStar?: string;
  commitmentFollowUp?: string | null;
  milestoneFollowUp?: string | null;
  driftAsk?: string | null;
  visionCheck?: string | null;
  purposeOpening?: string | null;
  lastInsight?: string;
  emotionalNote?: string;
  maturity?: CoachPromptContext["coachingMaturity"];
}): string {
  const { name, isReturning } = input;

  if (!isReturning) {
    return `Say hello to ${name === "there" ? "them" : name} warmly. One short sentence that they're safe here — no performance. Ask one simple curious question about why they're here. Then wait. Never ask a blank menu of practice topics.`;
  }

  // Purpose overlays — at most one special ask in the opening
  if (input.commitmentFollowUp?.trim()) {
    return `Forge Law #012 + #014. Welcome back, ${name}. ${input.commitmentFollowUp.trim()} Then wait. No topic menu.`;
  }
  if (input.milestoneFollowUp?.trim()) {
    return `Forge Law #012 + #014. Welcome back, ${name}. One warm continuity sentence, then: ${input.milestoneFollowUp.trim()} Then wait.`;
  }
  if (input.visionCheck?.trim()) {
    return `Forge Law #012 + #014. Welcome back, ${name}. Brief warm hello, then: ${input.visionCheck.trim()} Then wait.`;
  }
  if (input.driftAsk?.trim()) {
    return `Forge Law #012 + #014. Welcome back, ${name}. Briefly note the recent practice theme, then ask the drift question (never judge): ${input.driftAsk.trim()} Then wait.`;
  }

  const when = relativeSessionPhrase(input.lastSessionAt);
  const north = input.northStar?.trim() || "";
  const goal =
    input.communicationGoal?.trim() ||
    input.longTermChallenge?.trim() ||
    north ||
    "";
  const struggle = input.lastStruggle?.trim() || "";
  const win = input.recentWin?.trim() || "";
  const pattern =
    input.adaptiveInsight?.trim() ||
    input.speakingHabit?.trim() ||
    "";
  const emotion = input.emotionalNote?.trim() || "";
  const depth =
    input.maturity === "deep"
      ? "They already know you. Skip motivational speeches. Say you know they've done this before — go one level deeper."
      : input.maturity === "familiar"
        ? "You've practiced together before. Be warm, not introductory."
        : "";
  const softEmotion = emotion
    ? ` If it fits, gently remember the emotional texture (${emotion}) — never diagnose.`
    : "";

  if (north && input.purposeOpening) {
    return `Forge Law #012 + #014 purpose. Welcome back, ${name}. Connect today's practice to their declared north star (${north}) in one short sentence — e.g. practice that counts toward what they said they want to build. Then one open choice: keep going there, or something new on their mind? No blank menu. Then wait.`;
  }

  if (goal && (struggle || pattern || win)) {
    const observed =
      struggle ||
      pattern ||
      (win ? `you made progress: ${win}` : "");
    return `Forge Law #012 continuity. Welcome back, ${name}. ${depth}${softEmotion} In 3 short sentences, speak like this (adapt to facts — do not invent numbers): "${when} you wanted to work on ${goal}. ${observed}. Want to keep working there, or is there something new on your mind today?" Never ask "What would you like to practice today?" as a blank menu. Then wait.`;
  }

  if (input.lastInsight?.trim()) {
    return `Forge Law #012. Welcome back, ${name}. ${depth}${softEmotion} Briefly carry forward last session's insight (${input.lastInsight.trim()}) without lecturing. Then one open choice: continue there, or something new on their mind? Then wait.`;
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

/** Which purpose overlay wins the welcome (mirrors buildWelcomeHint priority). */
export function selectPurposeOpeningKind(input: {
  isReturning: boolean;
  commitmentFollowUp?: string | null;
  milestoneFollowUp?: string | null;
  visionCheck?: string | null;
  driftAsk?: string | null;
  purposeOpening?: string | null;
  northStar?: string;
}): CoachPromptContext["purposeOpeningKind"] {
  if (!input.isReturning) return "none";
  if (input.commitmentFollowUp?.trim()) return "commitment";
  if (input.milestoneFollowUp?.trim()) return "milestone";
  if (input.visionCheck?.trim()) return "vision";
  if (input.driftAsk?.trim()) return "drift";
  if (input.northStar?.trim() && input.purposeOpening?.trim()) return "purpose";
  return "none";
}

export function buildCoachPromptContext(
  memory: CoachMemory | null,
  recentReports: SessionReport[] = []
): CoachPromptContext {
  const mem = memory ?? emptyCoachMemory("unknown");
  const name = preferredName(mem);
  const sessionsCompleted = mem.sessionsCompleted || recentReports.length;
  const isReturning = sessionsCompleted > 0;
  const adaptiveInsight = buildAdaptiveInsight(recentReports);
  const lastReport = recentReports[0];
  const lastSessionAt =
    mem.lastSessionAt ||
    lastReport?.completedAt ||
    lastReport?.createdAt ||
    null;
  const maturity = coachingMaturity(sessionsCompleted);

  const purposeHints = buildPurposePromptHints(mem, recentReports);
  const purposeBlock = formatPurposeMemoryBlock(mem, recentReports);

  const purposeOverlays = {
    commitmentFollowUp: purposeHints.commitmentFollowUp,
    milestoneFollowUp: purposeHints.milestoneFollowUp,
    driftAsk: purposeHints.driftAsk,
    visionCheck: purposeHints.visionCheck,
    purposeOpening: purposeHints.purposeOpening,
    northStar: mem.northStar,
  };

  const welcomeHint = buildWelcomeHint({
    name,
    isReturning,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionAt,
    lastStruggle: mem.topicsWorkingOn[0] || lastReport?.biggestWeakness,
    recentWin: mem.recentWins[0] || mem.biggestStrength,
    speakingHabit: mem.knownPatterns[0] || mem.speakingHabits[0],
    adaptiveInsight,
    longTermChallenge: mem.longTermChallenges[0],
    communicationGoal:
      mem.communicationGoals[0] || mem.longTermGoal || mem.northStar,
    lastInsight: mem.lastSessionInsight || lastReport?.sessionInsight,
    emotionalNote: mem.emotionalNotes[0] || lastReport?.emotionalNote,
    maturity,
    ...purposeOverlays,
  });

  const purposeOpeningKind = selectPurposeOpeningKind({
    isReturning,
    ...purposeOverlays,
  });

  const openCommitment =
    mem.commitments.find((c) => c.status === "open" && !c.followedUpAt)?.text ||
    mem.commitments.find((c) => c.status === "open")?.text ||
    "";

  return {
    firstName: name,
    nickname: mem.preferredNickname.trim(),
    isReturning,
    sessionsCompleted,
    coachingMaturity: maturity,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionSummary: mem.lastSessionSummary,
    lastSessionAt,
    lastSessionInsight:
      mem.lastSessionInsight || lastReport?.sessionInsight || "",
    recentWins: mem.recentWins.slice(0, 3),
    topicsWorkingOn: mem.topicsWorkingOn.slice(0, 3),
    communicationGoals: mem.communicationGoals.slice(0, 3),
    longTermChallenges: mem.longTermChallenges.slice(0, 3),
    biggestFears: mem.biggestFears.slice(0, 3),
    emotionalTriggers: mem.emotionalTriggers.slice(0, 3),
    emotionalNotes: mem.emotionalNotes.slice(0, 3),
    knownPatterns: mem.knownPatterns.slice(0, 4),
    motivators: mem.motivators.slice(0, 4),
    longTermGoal: mem.longTermGoal || mem.northStar,
    preferredCoachingStyle: mem.preferredCoachingStyle,
    learningStyle: mem.learningStyle,
    confidenceLevel: mem.confidenceLevel,
    biggestStrength: mem.biggestStrength,
    speakingHabits: mem.speakingHabits.slice(0, 3),
    adaptiveInsight,
    welcomeHint,
    northStar: mem.northStar,
    lifeVision: mem.lifeVision,
    personTheyWantToBecome: mem.personTheyWantToBecome,
    openCommitment,
    purposeBlock,
    purposeOpeningKind,
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

  const maturityLine =
    ctx.coachingMaturity === "deep"
      ? "Relationship maturity: deep — skip pep talks; go one level deeper."
      : ctx.coachingMaturity === "familiar"
        ? "Relationship maturity: familiar — they know you; don't re-introduce."
        : "Relationship maturity: new — earn trust gently.";

  if (!ctx.isReturning) {
    return `
Member relationship memory:
- First saved session for ${ctx.firstName}.
- Nickname: ${ctx.nickname || "(none)"}
- Opening style: ${ctx.welcomeHint}
- Learning style: ${learning}
- ${maturityLine}
- Remember: understand before coaching. No topic menus.
${ctx.purposeBlock}
`;
  }

  return `
Member relationship memory (use this — do not pretend you just met them):
- Call them: ${ctx.firstName}${ctx.nickname ? ` (nickname: ${ctx.nickname})` : ""}
- Sessions completed: ${ctx.sessionsCompleted}
- ${maturityLine}
- Last scenario: ${ctx.lastScenarioTitle || "(unknown)"}
- Last practiced: ${ctx.lastSessionAt || "(unknown)"}
- Last lasting insight: ${ctx.lastSessionInsight || "(none)"}
- Last summary: ${ctx.lastSessionSummary || "(none)"}
- Biggest strength: ${ctx.biggestStrength || "(none yet)"}
- Known patterns: ${ctx.knownPatterns.join("; ") || ctx.speakingHabits.join("; ") || "(none yet)"}
- Emotional notes (handle gently — not diagnoses): ${ctx.emotionalNotes.join("; ") || ctx.emotionalTriggers.join("; ") || "(none yet)"}
- Recent wins: ${ctx.recentWins.join("; ") || "(none yet)"}
- Soft focus / last struggle (do NOT recite as a checklist): ${ctx.topicsWorkingOn.join("; ") || "(none yet)"}
- Long-term challenges: ${ctx.longTermChallenges.join("; ") || "(not set)"}
- Communication goals: ${ctx.communicationGoals.join("; ") || "(not set)"}
- Motivators: ${ctx.motivators.join("; ") || "(not set)"}
- Long-term goal: ${ctx.longTermGoal || ctx.northStar || "(not set)"}
- Preferred coaching style: ${ctx.preferredCoachingStyle || "warm, curious, unhurried"}
- Learning style: ${learning}
- Confidence level (approx): ${ctx.confidenceLevel ?? "unknown"}
- Pattern insight: ${ctx.adaptiveInsight || "(none)"}
- Opening style: ${ctx.welcomeHint}
${ctx.purposeBlock}
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
