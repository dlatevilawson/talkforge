/**
 * Post-claim understanding confirmation — human-readable LP, not a settings form.
 * Builds the first Forge handoff from THIS Assistant Coach session, not historical LP.
 */
import { addProfileEvidence } from "../system1/profile-evidence.ts";
import type { ProfileEvidenceRecord } from "../system1/profile-evidence.ts";
import type { LivingProfile, ProvenanceRecord } from "../system1/types.ts";

export const AC_CONFIRM_PATH = "/coach/confirm";
export const AC_HANDOFF_SOURCE = "ac";

export type ConfirmationFields = {
  workingOn: string;
  difficulty: string;
  identifiedMoment: string;
  firstWork: string;
};

export type ConfirmationView = ConfirmationFields & {
  heading: string;
  canContinue: boolean;
};

export type ConfirmationViewOptions = {
  /** User turns from the AC session being claimed — used only to recover a moment. */
  userMessages?: string[];
};

const GROUNDED_CONFIDENCE = new Set(["high", "medium", "low"]);

const SPEECH_ACT =
  /\b(tell|telling|told|ask|asking|asked|say|saying|said|speak|speaking|talk|talking|present|presenting|pitch|answer|answering|opener|challenge|challenged)\b/i;

const WHEN_SCENE =
  /\bwhen\b.{0,80}\b(ask|tell|challeng|put on the spot|open|hire|about yourself)\b/i;

const START_CONVERSATION =
  /\b(start|starting|begin|beginning|open|opening)\b.{0,40}\b(conversation|chat|talk)\b/i;

const REACH_OUT =
  /\breach(?:ing)?\s+out\b|\bsend(?:ing)?\s+(?:a\s+)?(?:text|message|hello|note)\b/i;

/**
 * Member-facing confirmation copy: address the visitor as "you".
 * Does not rewrite quoted speech or the other person in the scene ("when they ask").
 */
export function toMemberFacingYou(text: string): string {
  const raw = text.trim();
  if (!raw) return "";
  if (/^you\b/i.test(raw)) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  let t = raw;
  t = t.replace(/\bthe visitor\b/gi, "you");
  t = t.replace(/\bthe member\b/gi, "you");
  t = t.replace(/\bthis person\b/gi, "you");
  // Observation-style third person at the start — not "when they ask".
  t = t.replace(/^they\s+likely\s+want(?:s)?\b/i, "You want");
  t = t.replace(/^they\s+likely\s+need(?:s)?\b/i, "You need");
  t = t.replace(/^they\s+report(?:s)?\s+that\b/i, "You find that");
  t = t.replace(/^they\s+report(?:s)?\b/i, "You said");
  t = t.replace(/^they\s+want(?:s)?\b/i, "You want");
  t = t.replace(/^they\s+need(?:s)?\b/i, "You need");

  t = t.replace(
    /^(Has|Wants|Needs|Rushes|Blanks|Loses|Gets|Named|Is considering|Is preparing)\b/i,
    (match) => {
      const key = match.toLowerCase();
      const map: Record<string, string> = {
        has: "You have",
        wants: "You want",
        needs: "You need",
        rushes: "You rush",
        blanks: "You blank",
        loses: "You lose",
        gets: "You get",
        named: "You named",
        "is considering": "You’re considering",
        "is preparing": "You’re preparing",
      };
      return map[key] ?? match;
    }
  );

  // Observation-style "Rushes and loses confidence…"
  if (!/^you\b/i.test(t) && /^(Rush|Blank|Lose|Get|Freeze|Speed)\b/i.test(t)) {
    t = `You ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  }

  if (/^you\b/i.test(t)) {
    t = t.replace(/\band wants\b/gi, "and want");
    t = t.replace(/\band needs\b/gi, "and need");
    t = t.replace(/\band loses\b/gi, "and lose");
  }

  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * A practicable conversational moment — a scene of speaking — not a life-topic.
 * "Considering a career change" is context.
 * "Telling my wife I’m considering a career change" is the moment.
 */
export function isPracticableMoment(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (SPEECH_ACT.test(t) || WHEN_SCENE.test(t)) return true;
  if (START_CONVERSATION.test(t) || REACH_OUT.test(t)) return true;
  if (/["“']/.test(t) && t.length >= 16) return true;
  return false;
}

function isAssistantCoachEvidence(row: ProfileEvidenceRecord): boolean {
  return row.sourceType === "assistant_coach";
}

function grounded(ledger: ProfileEvidenceRecord[]): ProfileEvidenceRecord[] {
  return ledger.filter(
    (e) =>
      GROUNDED_CONFIDENCE.has(e.confidence) &&
      (e.text?.trim().length ?? 0) >= 8
  );
}

function latest(
  rows: ProfileEvidenceRecord[],
  categories: ProfileEvidenceRecord["category"][]
): string {
  const match = rows.filter((e) => categories.includes(e.category));
  return match.at(-1)?.text.trim() ?? "";
}

function latestMoment(rows: ProfileEvidenceRecord[]): string {
  const lived = rows.filter((e) => e.category === "lived_example");
  for (let i = lived.length - 1; i >= 0; i--) {
    if (isPracticableMoment(lived[i].text)) return lived[i].text.trim();
  }
  const sceneCats: ProfileEvidenceRecord["category"][] = [
    "communication_friction",
    "observed_pattern",
    "communication_context",
  ];
  const rest = rows.filter((e) => sceneCats.includes(e.category));
  for (let i = rest.length - 1; i >= 0; i--) {
    if (isPracticableMoment(rest[i].text)) return rest[i].text.trim();
  }
  return "";
}

function whoFromMessages(messages: string[]): string {
  const blob = messages.join(" ");
  if (/\b(my )?wife\b/i.test(blob)) return "my wife";
  if (/\b(my )?husband\b/i.test(blob)) return "my husband";
  if (/\bfriends?\b/i.test(blob)) return "a friend";
  if (/\b(manager|boss)\b/i.test(blob)) return "my manager";
  return "";
}

function groundMomentWithWho(text: string, messages: string[]): string {
  const who = whoFromMessages(messages);
  if (!who) return text;
  if (new RegExp(who.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
    return text;
  }
  if (
    /\bstart(?:ing)?(?:\s+a)?\s+conversation\b/i.test(text) &&
    !/\bwith\b/i.test(text)
  ) {
    return text.replace(
      /\b(start(?:ing)?(?:\s+a)?\s+conversation)\b/i,
      `$1 with ${who}`
    );
  }
  return text;
}

function momentFromUserMessages(messages: string[] | undefined): string {
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i]?.trim() ?? "";
    if (!isPracticableMoment(text)) continue;
    return groundMomentWithWho(text, messages);
  }
  return "";
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim() ?? "";
    if (t) return t;
  }
  return "";
}

/**
 * Confirmation fields come from THIS AC session's evidence.
 * Historical member goals/challenges/lived examples are not used as the moment.
 */
export function buildConfirmationView(
  profile: LivingProfile | null | undefined,
  options?: ConfirmationViewOptions
): ConfirmationView {
  const ledger = grounded(profile?.evidenceLedger ?? []);
  const acLedger = ledger.filter(isAssistantCoachEvidence);
  const preferred = acLedger.length > 0 ? acLedger : ledger;

  const workingOn = toMemberFacingYou(
    latest(preferred, ["communication_goal", "desired_outcome"])
  );
  const difficulty = toMemberFacingYou(
    latest(preferred, ["communication_friction", "observed_pattern"])
  );
  const identifiedMoment = toMemberFacingYou(
    firstNonEmpty(
      momentFromUserMessages(options?.userMessages),
      latestMoment(preferred)
    )
  );

  const firstWork = identifiedMoment
    ? `Stay clear and structured in that moment: ${identifiedMoment}`
    : "";

  return {
    heading: "Here’s what I’ve understood about you so far",
    workingOn,
    difficulty,
    identifiedMoment,
    firstWork,
    canContinue: isPracticableMoment(identifiedMoment),
  };
}

export function confirmationFromSubmittedFields(
  fields: ConfirmationFields
): ConfirmationView {
  const identifiedMoment = fields.identifiedMoment.trim();
  return {
    heading: "Here’s what I’ve understood about you so far",
    workingOn: fields.workingOn.trim(),
    difficulty: fields.difficulty.trim(),
    identifiedMoment,
    firstWork: fields.firstWork.trim(),
    canContinue: isPracticableMoment(identifiedMoment),
  };
}

export function buildFirstPracticeHref(fields: ConfirmationFields): string {
  const title = fields.identifiedMoment.trim().slice(0, 180);
  if (!title || !isPracticableMoment(title)) return "";
  const success = firstNonEmpty(
    fields.firstWork,
    `Stay clear and structured in: ${title}`
  ).slice(0, 240);
  const q = new URLSearchParams({
    title,
    success,
    start: "1",
    source: AC_HANDOFF_SOURCE,
  });
  return `/app/practice?${q.toString()}`;
}

export function isAssistantCoachPracticeHandoff(input: {
  source?: string | null;
  title?: string | null;
}): boolean {
  return (
    input.source === AC_HANDOFF_SOURCE && Boolean(input.title?.trim())
  );
}

export function isConfirmedForgeHandoffHref(href: string): boolean {
  if (!href.startsWith("/app/practice?")) return false;
  try {
    const url = new URL(href, "https://talkforge.local");
    return isAssistantCoachPracticeHandoff({
      source: url.searchParams.get("source"),
      title: url.searchParams.get("title"),
    });
  } catch {
    return false;
  }
}

export function applyConfirmationToLivingProfile(
  profile: LivingProfile,
  fields: ConfirmationFields,
  now: Date = new Date()
): LivingProfile {
  const iso = now.toISOString();
  const workingOn = fields.workingOn.trim();
  const difficulty = fields.difficulty.trim();
  const moment = fields.identifiedMoment.trim();
  const goals = workingOn
    ? [workingOn, ...(profile.goals ?? []).filter((g) => g.trim() !== workingOn)]
    : profile.goals ?? [];
  const challenges = difficulty
    ? [
        difficulty,
        ...(profile.challenges ?? []).filter((c) => c.trim() !== difficulty),
      ]
    : profile.challenges ?? [];

  let evidenceLedger = profile.evidenceLedger ?? [];
  if (moment && isPracticableMoment(moment)) {
    evidenceLedger = addProfileEvidence(evidenceLedger, {
      id: `ev_ac_confirm_moment_${iso}`,
      userId: profile.userId,
      sourceType: "member_statement",
      sourceId: "assistant_coach_confirm",
      observedAt: iso,
      text: moment,
      category: "lived_example",
      confidence: "high",
    });
  }

  const confirmation: ProvenanceRecord = {
    id: `prov_lp_confirm_${iso}`,
    fieldPath: "understanding_confirmation",
    claim: "Member confirmed Coach understanding before first practice",
    sourceKind: "confirmed_by_member",
    evidenceRefs: ["assistant_coach_confirm"],
    confidence: "high",
    createdAt: iso,
    updatedAt: iso,
    memberConfirmed: true,
  };

  return {
    ...profile,
    goals: goals.slice(0, 8),
    challenges: challenges.slice(0, 8),
    purposeStatement: profile.purposeStatement,
    personalPrinciples: profile.personalPrinciples,
    seasons: profile.seasons,
    evidenceLedger,
    profileInsights: (profile.profileInsights ?? []).map((insight) =>
      insight.status === "supported" || insight.status === "tentative"
        ? { ...insight, status: "member_confirmed" as const, updatedAt: iso }
        : insight
    ),
    provenance: [confirmation, ...(profile.provenance ?? [])].slice(0, 200),
    updatedAt: iso,
  };
}

export function isAssistantCoachConfirmPath(pathname: string): boolean {
  return (
    pathname === AC_CONFIRM_PATH || pathname.startsWith(`${AC_CONFIRM_PATH}/`)
  );
}

export function isAssistantCoachHandoffPath(pathname: string): boolean {
  return pathname.startsWith("/app/practice");
}
