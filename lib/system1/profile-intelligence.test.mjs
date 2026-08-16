/**
 * Phase 1 — Profile evidence + intelligence foundation tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { emptyLivingProfile } from "./profile.ts";
import {
  addProfileEvidence,
  createProfileEvidence,
  looksLikeInteractionSignal,
} from "./profile-evidence.ts";
import {
  addEvidenceToLivingProfile,
  applyDerivedInsightsToLivingProfile,
  buildCoachContext,
  deriveProfileInsights,
} from "./profile-intelligence.ts";

const USER = "user_phase1_test";
const NOW = "2026-08-15T12:00:00.000Z";

test("A. user statement becomes evidence", () => {
  const ledger = addProfileEvidence([], {
    id: "ev_goal_1",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "utterance_1",
    observedAt: NOW,
    text: "I want to stop overexplaining in meetings",
    category: "communication_goal",
    confidence: "high",
  });
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].category, "communication_goal");
  assert.equal(ledger[0].text, "I want to stop overexplaining in meetings");
  assert.equal(ledger[0].sourceType, "member_statement");
});

test("B. evidence can support an insight", () => {
  let ledger = addProfileEvidence([], {
    id: "ev_pat_1",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "I keep circling and saying what I mean is",
    category: "observed_pattern",
    confidence: "medium",
  });
  ledger = addProfileEvidence(ledger, {
    id: "ev_pat_2",
    userId: USER,
    sourceType: "session_observation",
    sourceId: "u2",
    observedAt: NOW,
    text: "I keep circling and saying what I mean is",
    category: "observed_pattern",
    confidence: "medium",
  });
  const insights = deriveProfileInsights(ledger, { now: NOW });
  const pattern = insights.find((i) => i.kind === "root_pattern");
  assert.ok(pattern);
  assert.equal(pattern.status, "supported");
  assert.equal(pattern.evidenceRefs.length, 2);
  assert.match(pattern.statement, /circling/i);
});

test("C. one utterance does not create unsupported identity claims", () => {
  const profile = emptyLivingProfile(USER, "Alex");
  profile.purposeStatement = "Lead with clarity";
  const withEv = addEvidenceToLivingProfile(profile, {
    id: "ev_one",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "I freeze when my boss asks a question",
    category: "communication_friction",
    confidence: "medium",
  });
  const next = applyDerivedInsightsToLivingProfile(withEv, { now: NOW });
  assert.equal(next.purposeStatement, "Lead with clarity");
  assert.equal(next.profileInsights.length, 1);
  assert.equal(next.profileInsights[0].status, "tentative");
  assert.notEqual(next.profileInsights[0].status, "member_confirmed");
  assert.deepEqual(next.personalPrinciples, []);
});

test("D. conflicting evidence preserves uncertainty", () => {
  let ledger = addProfileEvidence([], {
    id: "ev_a",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "I freeze under pressure",
    category: "observed_pattern",
    confidence: "high",
  });
  ledger = addProfileEvidence(ledger, {
    id: "ev_b",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u2",
    observedAt: NOW,
    text: "I overexplain when I feel unsure",
    category: "observed_pattern",
    confidence: "high",
  });
  const insights = deriveProfileInsights(ledger, { now: NOW });
  const patterns = insights.filter((i) => i.kind === "root_pattern");
  assert.equal(patterns.length, 2);
  assert.ok(patterns.every((i) => i.status === "tentative"));
  assert.ok(patterns.every((i) => i.competingInsightIds.length === 1));
  assert.ok(patterns.every((i) => i.confidence !== "high"));
});

test("E. I don't know can be interaction signal but not profile fact", () => {
  assert.equal(looksLikeInteractionSignal("I don't know"), true);
  assert.equal(looksLikeInteractionSignal("I can't remember"), true);

  const coerced = createProfileEvidence({
    id: "ev_idk",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "I don't remember",
    category: "observed_pattern",
    confidence: "high",
  });
  assert.equal(coerced.category, "interaction_signal");
  assert.equal(coerced.confidence, "uncertain");

  const insights = deriveProfileInsights([coerced], { now: NOW });
  assert.equal(insights.length, 0);
});

test("F. synthesized insight never re-enters the evidence ledger", () => {
  assert.throws(
    () =>
      addProfileEvidence([], {
        id: "ev_bad",
        userId: USER,
        sourceType: "member_statement",
        sourceId: "synth_1",
        text: "Primary bottleneck is verbal retrieval",
        category: "observed_pattern",
        metadata: { synthesized: true },
      }),
    /Synthesized claims must never enter/
  );

  assert.throws(
    () =>
      addProfileEvidence([], {
        id: "ev_bad2",
        userId: USER,
        sourceType: "session_observation",
        sourceId: "insight_loop",
        text: "Training implication recycled as evidence",
        category: "observed_pattern",
        metadata: { insightId: "pins_root_pattern_x", derivedInsight: true },
      }),
    /must not re-enter the evidence ledger/
  );
});

test("G. coach context contains supported useful information only", () => {
  let profile = emptyLivingProfile(USER, "Alex");
  profile = {
    ...profile,
    purposeStatement: "Secret purpose must not appear in coach dump",
    goals: ["Speak clearly"],
    strengths: ["Listens well"],
  };
  profile = addEvidenceToLivingProfile(profile, {
    id: "ev_ctx",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "Work meetings with my manager",
    category: "communication_context",
    confidence: "high",
  });
  profile = addEvidenceToLivingProfile(profile, {
    id: "ev_pat",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u2",
    observedAt: NOW,
    text: "I freeze when put on the spot",
    category: "observed_pattern",
    confidence: "medium",
  });
  profile = addEvidenceToLivingProfile(profile, {
    id: "ev_pat2",
    userId: USER,
    sourceType: "session_observation",
    sourceId: "u3",
    observedAt: NOW,
    text: "I freeze when put on the spot",
    category: "observed_pattern",
    confidence: "medium",
  });
  profile = addEvidenceToLivingProfile(profile, {
    id: "ev_idk",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u4",
    observedAt: NOW,
    text: "I don't know",
    category: "interaction_signal",
  });
  profile = applyDerivedInsightsToLivingProfile(profile, { now: NOW });

  const ctx = buildCoachContext(profile);
  assert.ok(ctx.goals.includes("Speak clearly"));
  assert.ok(ctx.keyEnvironments.some((e) => /manager/i.test(e)));
  assert.ok(ctx.supportedPatterns.some((p) => /freeze/i.test(p)));
  assert.ok(ctx.strengths.includes("Listens well"));
  assert.ok(ctx.recentEvidence.every((e) => e.category !== "interaction_signal"));
  assert.equal(
    JSON.stringify(ctx).includes("Secret purpose"),
    false,
    "coach context must not dump member purpose"
  );
  assert.equal("purposeStatement" in ctx, false);
  assert.equal("evidenceLedger" in ctx, false);
  assert.equal("profileInsights" in ctx, false);
});

test("H. member-owned purpose is never inferred or overwritten", () => {
  let profile = emptyLivingProfile(USER);
  profile = { ...profile, purposeStatement: "Member declared north star" };
  profile = addEvidenceToLivingProfile(profile, {
    id: "ev_outcome",
    userId: USER,
    sourceType: "member_statement",
    sourceId: "u1",
    observedAt: NOW,
    text: "I want to answer clearly without freezing",
    category: "desired_outcome",
    confidence: "high",
  });
  profile = applyDerivedInsightsToLivingProfile(profile, { now: NOW });
  assert.equal(profile.purposeStatement, "Member declared north star");

  const emptyPurpose = emptyLivingProfile(USER);
  const after = applyDerivedInsightsToLivingProfile(
    addEvidenceToLivingProfile(emptyPurpose, {
      id: "ev_outcome2",
      userId: USER,
      sourceType: "member_statement",
      sourceId: "u1",
      observedAt: NOW,
      text: "I want to answer clearly without freezing",
      category: "desired_outcome",
    }),
    { now: NOW }
  );
  assert.equal(after.purposeStatement, "");
  assert.ok(after.profileInsights.some((i) => i.kind === "focus_area"));
});
