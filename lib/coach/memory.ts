import { buildAdaptiveInsight } from "@/lib/coach/growth";
import type {
  CoachMemory,
  CoachPromptContext,
  LearningStyle,
  SessionReport,
} from "@/lib/coach/types";
import type { LivingProfile } from "@/lib/system1/types";

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
 *
 * AUDIT-001 C4 / Forge Law #016: experiences must NOT write identity-adjacent
 * fields (strengths, habits, confidence, goals, wins-as-identity). Those become
 * evidence proposals via `proposeIdentityEvidenceFromReport` (lib/system1).
 *
 * This function updates Reality/continuity fields only: last session, scenario
 * history, session counts. Member-declared identity fields are left untouched.
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
    // Identity-adjacent fields intentionally NOT updated from session reports:
    // recentWins, topicsWorkingOn, biggestStrength, confidenceLevel, speakingHabits
    favoriteScenarios: uniqPush(memory.favoriteScenarios, scenario),
    pastExercises: uniqPush(memory.pastExercises, scenario, 12),
    lastSessionId: report.sessionId,
    lastSessionSummary: report.coachSummary.slice(0, 400),
    lastScenarioTitle: scenario,
    lastSessionAt: report.completedAt ?? report.createdAt,
    sessionsCompleted: Math.max(memory.sessionsCompleted + 1, report.sessionNumber),
    updatedAt: new Date().toISOString(),
  };
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
    return `First-time welcome (CFX §5). Say hello to ${name === "there" ? "them" : name} warmly. One short sentence that they're welcome and safe — no performance. Do not give a TalkForge product tour. Invite curiosity with one simple question about what brought them in. Learn who they are through conversation — never interrogate profile fields. Then wait. Never ask a blank menu of practice topics.`;
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

/**
 * Build coach prompt context.
 * Identity fields come exclusively from Living Profile (SSOT). CoachMemory
 * supplies last-session continuity only.
 * Unconfirmed LP provenance is never treated as identity fact.
 */
export function buildCoachPromptContext(
  memory: CoachMemory | null,
  recentReports: SessionReport[] = [],
  livingProfile: LivingProfile | null = null
): CoachPromptContext {
  const mem = memory ?? emptyCoachMemory("unknown");
  const lp = livingProfile;

  const nickname = lp?.preferredNickname.trim() ?? "";
  const display = lp?.displayName.trim() ?? "";
  const name = nickname || firstName(display);

  const communicationGoals = [
    lp?.purposeStatement.trim() ?? "",
    ...(lp?.personalPrinciples.map((p) => p.text.trim()) ?? []),
  ]
    .filter(Boolean)
    .slice(0, 3);

  const longTermChallenges = (lp?.seasons ?? [])
    .map((s) => s.label.trim())
    .filter(Boolean)
    .slice(0, 3);

  const preferredCoachingStyle = lp?.preferredCoachingStyle.trim() ?? "";

  // Confirmed / member-declared strength only — never pending evidence
  const confirmedStrength =
    lp?.provenance.find(
      (p) =>
        p.memberConfirmed &&
        p.fieldPath.includes("strength") &&
        p.claim.trim()
    )?.claim ?? "";

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
    lastStruggle: lastReport?.biggestWeakness,
    recentWin: confirmedStrength,
    speakingHabit: "", // habits are evidence proposals — not identity facts in prompt as truth
    adaptiveInsight,
    longTermChallenge: longTermChallenges[0],
    communicationGoal: communicationGoals[0],
  });

  return {
    firstName: name,
    nickname,
    isReturning,
    sessionsCompleted: mem.sessionsCompleted || recentReports.length,
    lastScenarioTitle: mem.lastScenarioTitle,
    lastSessionSummary: mem.lastSessionSummary,
    lastSessionAt,
    recentWins: [],
    topicsWorkingOn: [],
    communicationGoals,
    longTermChallenges,
    biggestFears: [],
    emotionalTriggers: [],
    preferredCoachingStyle,
    learningStyle: "",
    // Do not treat session-scored confidence as identity
    confidenceLevel: null,
    biggestStrength: confirmedStrength || "",
    speakingHabits: [],
    adaptiveInsight,
    welcomeHint,
  };
}

const LEARNING_STYLE_LABELS: Record<Exclude<LearningStyle, "">, string> = {
  practice_first: "prefers balanced, measured coaching pressure",
  reflect_first: "prefers supportive, lower-pressure coaching",
  example_first: "prefers balanced, measured coaching pressure",
  challenge_first: "prefers direct, high-tension coaching pressure",
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
- Coaching pressure: ${learning}
- CFX §5: welcome · curiosity · natural discovery. No product tour. No interrogation.
- Remember: understand before coaching. Member speaks more. No topic menus.
`;
  }

  return `
Member relationship memory (Living Profile = identity SSOT; continuity = last session):
- Call them: ${ctx.firstName}${ctx.nickname ? ` (nickname: ${ctx.nickname})` : ""}
- Sessions completed: ${ctx.sessionsCompleted}
- Last scenario: ${ctx.lastScenarioTitle || "(unknown)"}
- Last practiced: ${ctx.lastSessionAt || "(unknown)"}
- Last summary: ${ctx.lastSessionSummary || "(none)"}
- Confirmed strength (identity only if member/evidence-confirmed): ${ctx.biggestStrength || "(none yet)"}
- Soft focus / last struggle (session context — NOT identity fact): ${ctx.topicsWorkingOn.join("; ") || "(none yet)"}
- Life seasons / challenges (from Living Profile): ${ctx.longTermChallenges.join("; ") || "(not set)"}
- Purpose / goals (from Living Profile): ${ctx.communicationGoals.join("; ") || "(not set)"}
- Emotional triggers (continuity care): ${ctx.emotionalTriggers.join("; ") || ctx.biggestFears.join("; ") || "(not set)"}
- Preferred coaching style: ${ctx.preferredCoachingStyle || "warm, curious, unhurried"}
- Coaching pressure: ${learning}
- Pattern insight (session analytics — not identity): ${ctx.adaptiveInsight || "(none)"}
- Opening style: ${ctx.welcomeHint}
- Law #016: do not invent or overwrite who they are becoming.
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
