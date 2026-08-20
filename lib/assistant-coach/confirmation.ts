/**
 * Post-claim understanding confirmation — human-readable LP, not a settings form.
 * Builds the first Forge handoff from confirmed fields (query params only).
 */
import { applyMemberLivingProfileUpdate } from "../system1/member-writes.ts";
import type { ProfileEvidenceRecord } from "../system1/profile-evidence.ts";
import type { LivingProfile, ProvenanceRecord } from "../system1/types.ts";

export const AC_CONFIRM_PATH = "/coach/confirm";

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

const GROUNDED_CONFIDENCE = new Set(["high", "medium", "low"]);

function latestByCategory(
  ledger: ProfileEvidenceRecord[] | undefined,
  categories: ProfileEvidenceRecord["category"][]
): string {
  const rows = (ledger ?? []).filter(
    (e) =>
      categories.includes(e.category) &&
      GROUNDED_CONFIDENCE.has(e.confidence) &&
      (e.text?.trim().length ?? 0) >= 8
  );
  return rows.at(-1)?.text.trim() ?? "";
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim() ?? "";
    if (t) return t;
  }
  return "";
}

export function buildConfirmationView(
  profile: LivingProfile | null | undefined
): ConfirmationView {
  const ledger = profile?.evidenceLedger ?? [];
  const workingOn = firstNonEmpty(
    latestByCategory(ledger, ["communication_goal", "desired_outcome"]),
    profile?.goals?.[0]
  );
  const difficulty = firstNonEmpty(
    latestByCategory(ledger, ["communication_friction", "observed_pattern"]),
    profile?.challenges?.[0]
  );
  const identifiedMoment = firstNonEmpty(
    latestByCategory(ledger, ["lived_example", "communication_context"]),
    difficulty
  );
  const firstWorkInsight = (profile?.profileInsights ?? []).find(
    (i) =>
      (i.kind === "training_implication" || i.kind === "focus_area") &&
      (i.status === "supported" ||
        i.status === "tentative" ||
        i.status === "member_confirmed") &&
      i.statement.trim().length >= 8
  );
  const firstWork = firstNonEmpty(
    firstWorkInsight?.statement,
    identifiedMoment
      ? `Stay clear and structured when ${identifiedMoment.replace(/^when\s+/i, "")}`
      : workingOn
        ? `Practice the moment inside: ${workingOn}`
        : ""
  );

  return {
    heading: "Here’s what I’ve understood about you so far",
    workingOn,
    difficulty,
    identifiedMoment,
    firstWork,
    canContinue: Boolean(workingOn || difficulty || identifiedMoment),
  };
}

export function buildFirstPracticeHref(fields: ConfirmationFields): string {
  const title = firstNonEmpty(
    fields.identifiedMoment,
    fields.workingOn,
    "Today’s practice"
  ).slice(0, 180);
  const success = firstNonEmpty(
    fields.firstWork,
    title ? `Stay clear and structured in: ${title}` : "Stay clear under pressure"
  ).slice(0, 240);
  const q = new URLSearchParams({
    title,
    success,
    start: "1",
  });
  return `/app/practice?${q.toString()}`;
}

export function applyConfirmationToLivingProfile(
  profile: LivingProfile,
  fields: ConfirmationFields,
  now: Date = new Date()
): LivingProfile {
  const iso = now.toISOString();
  let next = applyMemberLivingProfileUpdate(profile, {});
  const workingOn = fields.workingOn.trim();
  const difficulty = fields.difficulty.trim();
  const goals = workingOn
    ? [workingOn, ...(profile.goals ?? []).filter((g) => g.trim() !== workingOn)]
    : profile.goals ?? [];
  const challenges = difficulty
    ? [
        difficulty,
        ...(profile.challenges ?? []).filter((c) => c.trim() !== difficulty),
      ]
    : profile.challenges ?? [];

  next = {
    ...next,
    goals: goals.slice(0, 8),
    challenges: challenges.slice(0, 8),
    purposeStatement: profile.purposeStatement,
    personalPrinciples: profile.personalPrinciples,
    seasons: profile.seasons,
    profileInsights: (profile.profileInsights ?? []).map((insight) =>
      insight.status === "supported" || insight.status === "tentative"
        ? { ...insight, status: "member_confirmed" as const, updatedAt: iso }
        : insight
    ),
    updatedAt: iso,
  };

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
  next.provenance = [confirmation, ...(next.provenance ?? [])].slice(0, 200);
  return next;
}

export function isAssistantCoachConfirmPath(pathname: string): boolean {
  return (
    pathname === AC_CONFIRM_PATH || pathname.startsWith(`${AC_CONFIRM_PATH}/`)
  );
}
