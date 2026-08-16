/**
 * System 1 — Profile intelligence (derived insights + coach context).
 *
 * Insights are derived claims, separate from evidence.
 * They must NEVER re-enter the evidence ledger.
 * Do NOT call these clinical diagnoses.
 *
 * Conceptual reuse from assessment-synthesis field names (focusArea,
 * rootPattern, keyEnvironments, trainingImplications, uncertainty,
 * competing candidates) — expressed as reusable ProfileInsight kinds.
 */

import type { LivingProfile } from "./types.ts";
import {
  addProfileEvidence,
  evidenceForInsightDerivation,
  type AddProfileEvidenceInput,
  type ProfileEvidenceCategory,
  type ProfileEvidenceConfidence,
  type ProfileEvidenceRecord,
} from "./profile-evidence.ts";

export type ProfileInsightKind =
  | "focus_area"
  | "root_pattern"
  | "key_environment"
  | "communication_strength"
  | "training_implication"
  | "coaching_preference"
  | "practice_commitment";

export type ProfileInsightStatus =
  | "tentative"
  | "supported"
  | "member_confirmed"
  | "superseded";

export type ProfileInsightConfidence =
  | "high"
  | "medium"
  | "low"
  | "uncertain";

export type ProfileInsight = {
  id: string;
  kind: ProfileInsightKind;
  statement: string;
  confidence: ProfileInsightConfidence;
  evidenceRefs: string[];
  status: ProfileInsightStatus;
  competingInsightIds: string[];
  updatedAt: string;
};

/** Compact read-only coaching context — not a Living Profile dump. */
export type CoachContext = {
  goals: string[];
  activeFocusAreas: string[];
  supportedPatterns: string[];
  keyEnvironments: string[];
  strengths: string[];
  trainingImplications: string[];
  coachingPreferences: string[];
  practiceCapacity: string[];
  unresolvedQuestions: string[];
  recentEvidence: Array<{
    text: string;
    category: ProfileEvidenceCategory;
    observedAt: string;
  }>;
};

const CATEGORY_TO_KIND: Partial<
  Record<ProfileEvidenceCategory, ProfileInsightKind>
> = {
  communication_goal: "focus_area",
  communication_context: "key_environment",
  observed_pattern: "root_pattern",
  communication_friction: "root_pattern",
  communication_strength: "communication_strength",
  preference: "coaching_preference",
  practice_capacity: "practice_commitment",
  desired_outcome: "focus_area",
  lived_example: "root_pattern",
};

function insightId(
  kind: ProfileInsightKind,
  statement: string,
  evidenceId: string
): string {
  const slug = statement
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `pins_${kind}_${slug || evidenceId}`;
}

function mapConfidence(
  c: ProfileEvidenceConfidence
): ProfileInsightConfidence {
  if (c === "uncertain") return "uncertain";
  return c;
}

function normalizeStatement(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Derive profile insights from an evidence ledger.
 * Interaction signals never create insights.
 * Conflicting statements of the same kind stay tentative with competing ids.
 * Never mutates purpose / identity; never writes back into evidence.
 */
export function deriveProfileInsights(
  ledger: readonly ProfileEvidenceRecord[],
  options?: { now?: string; existing?: readonly ProfileInsight[] }
): ProfileInsight[] {
  const now = options?.now ?? new Date().toISOString();
  const usable = evidenceForInsightDerivation(ledger);
  const byKind = new Map<ProfileInsightKind, ProfileInsight[]>();

  for (const ev of usable) {
    const kind = CATEGORY_TO_KIND[ev.category];
    if (!kind) continue;
    const statement = normalizeStatement(ev.text);
    if (!statement) continue;

    const insight: ProfileInsight = {
      id: insightId(kind, statement, ev.id),
      kind,
      statement,
      confidence: mapConfidence(ev.confidence),
      evidenceRefs: [ev.id],
      status: "tentative",
      competingInsightIds: [],
      updatedAt: now,
    };

    const bucket = byKind.get(kind) ?? [];
    const existing = bucket.find(
      (i) =>
        i.statement.toLowerCase() === statement.toLowerCase() ||
        i.id === insight.id
    );
    if (existing) {
      if (!existing.evidenceRefs.includes(ev.id)) {
        existing.evidenceRefs = [...existing.evidenceRefs, ev.id];
      }
      if (
        ev.confidence === "high" ||
        (ev.confidence === "medium" && existing.confidence === "low")
      ) {
        existing.confidence = mapConfidence(ev.confidence);
      }
      if (existing.evidenceRefs.length >= 2 && existing.confidence !== "uncertain") {
        existing.status = "supported";
      }
      existing.updatedAt = now;
      continue;
    }
    bucket.push(insight);
    byKind.set(kind, bucket);
  }

  const derived: ProfileInsight[] = [];
  for (const [, bucket] of byKind) {
    if (bucket.length === 1) {
      const only = bucket[0]!;
      if (only.evidenceRefs.length >= 2 && only.confidence !== "uncertain") {
        only.status = "supported";
      } else if (
        only.confidence === "high" &&
        only.evidenceRefs.length >= 1
      ) {
        // Single high-confidence observation stays tentative until corroboration,
        // unless lived_example / pattern has enough length — keep tentative for safety.
        only.status = "tentative";
      }
      derived.push(only);
      continue;
    }

    // Competing claims: preserve uncertainty — all tentative, cross-linked.
    const ids = bucket.map((i) => i.id);
    for (const insight of bucket) {
      insight.status = "tentative";
      if (insight.confidence === "high") insight.confidence = "medium";
      insight.competingInsightIds = ids.filter((id) => id !== insight.id);
      insight.updatedAt = now;
      derived.push(insight);
    }
  }

  // Preserve member_confirmed / superseded from existing when statement+kind match.
  const existing = options?.existing ?? [];
  if (existing.length === 0) return derived;

  return derived.map((d) => {
    const prior = existing.find(
      (e) =>
        e.kind === d.kind &&
        e.statement.toLowerCase() === d.statement.toLowerCase()
    );
    if (!prior) return d;
    if (prior.status === "member_confirmed" || prior.status === "superseded") {
      return {
        ...d,
        status: prior.status,
        confidence: prior.status === "member_confirmed" ? "high" : d.confidence,
        competingInsightIds:
          prior.status === "superseded" ? d.competingInsightIds : [],
      };
    }
    return d;
  });
}

/**
 * Append evidence onto a Living Profile copy. Never touches purposeStatement.
 */
export function addEvidenceToLivingProfile(
  profile: LivingProfile,
  input: AddProfileEvidenceInput
): LivingProfile {
  const evidenceLedger = addProfileEvidence(profile.evidenceLedger, {
    ...input,
    userId: input.userId || profile.userId,
  });
  return {
    ...profile,
    evidenceLedger,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recompute active insights from the evidence ledger onto a profile copy.
 * Does not write insights into the evidence ledger. Does not touch purpose.
 */
export function applyDerivedInsightsToLivingProfile(
  profile: LivingProfile,
  options?: { now?: string }
): LivingProfile {
  const profileInsights = deriveProfileInsights(profile.evidenceLedger, {
    now: options?.now,
    existing: profile.profileInsights,
  });
  return {
    ...profile,
    profileInsights,
    updatedAt: options?.now ?? new Date().toISOString(),
  };
}

function uniqueStrings(values: string[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function statementsOf(
  insights: readonly ProfileInsight[],
  kind: ProfileInsightKind,
  statuses: ReadonlySet<ProfileInsightStatus>
): string[] {
  return insights
    .filter((i) => i.kind === kind && statuses.has(i.status))
    .map((i) => i.statement);
}

const ACTIVE: ReadonlySet<ProfileInsightStatus> = new Set([
  "supported",
  "member_confirmed",
  "tentative",
]);

const SUPPORTED: ReadonlySet<ProfileInsightStatus> = new Set([
  "supported",
  "member_confirmed",
]);

/**
 * Compact coach-facing context. Supported/useful information preferred;
 * unresolved competing insights surface as unresolvedQuestions.
 * Never dumps full Living Profile, transcripts, or raw provenance.
 * Never includes inferred purpose — purpose remains member-owned elsewhere.
 */
export function buildCoachContext(profile: LivingProfile): CoachContext {
  const insights = profile.profileInsights ?? [];
  const ledger = profile.evidenceLedger ?? [];

  const supportedPatterns = uniqueStrings([
    ...statementsOf(insights, "root_pattern", SUPPORTED),
  ]);

  const activeFocusAreas = uniqueStrings([
    ...statementsOf(insights, "focus_area", ACTIVE),
  ]);

  const keyEnvironments = uniqueStrings([
    ...statementsOf(insights, "key_environment", ACTIVE),
  ]);

  const strengths = uniqueStrings([
    ...profile.strengths,
    ...statementsOf(insights, "communication_strength", ACTIVE),
  ]);

  const trainingImplications = uniqueStrings(
    statementsOf(insights, "training_implication", ACTIVE)
  );

  const coachingPreferences = uniqueStrings([
    ...(profile.preferredCoachingStyle
      ? [profile.preferredCoachingStyle]
      : []),
    ...statementsOf(insights, "coaching_preference", ACTIVE),
  ]);

  const practiceCapacity = uniqueStrings(
    statementsOf(insights, "practice_commitment", ACTIVE)
  );

  const goals = uniqueStrings([...profile.goals, ...activeFocusAreas]);

  const unresolvedQuestions: string[] = [];
  for (const insight of insights) {
    if (insight.status !== "tentative") continue;
    if (insight.competingInsightIds.length > 0) {
      unresolvedQuestions.push(
        `Competing ${insight.kind.replace(/_/g, " ")}: ${insight.statement}`
      );
    } else if (insight.confidence === "uncertain" || insight.confidence === "low") {
      unresolvedQuestions.push(`Unconfirmed ${insight.kind.replace(/_/g, " ")}`);
    }
  }

  const recentEvidence = [...ledger]
    .filter((e) => e.category !== "interaction_signal")
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 5)
    .map((e) => ({
      text: e.text,
      category: e.category,
      observedAt: e.observedAt,
    }));

  return {
    goals,
    activeFocusAreas,
    supportedPatterns,
    keyEnvironments,
    strengths,
    trainingImplications,
    coachingPreferences,
    practiceCapacity,
    unresolvedQuestions: uniqueStrings(unresolvedQuestions, 6),
    recentEvidence,
  };
}
