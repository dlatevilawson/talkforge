import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  PRACTICE_AUDIENCE_CATALOG,
  PRACTICE_PATTERN_CATALOG,
  PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH,
  PRACTICE_TOPIC_CATALOG,
  PRACTICE_URGENCY_CATALOG,
  PracticeProfileValidationError,
  buildForgePracticeContext,
  createVerifiedMemberPracticeProfile,
  isCompleteMemberPracticeProfileSelection,
  projectMemberPracticeProfile,
  selectMemberPracticeProfileSelection,
  validateMemberPracticeProfileSelection,
} from "./practice-profile.ts";
import { applyMemberPracticeProfileUpdate } from "../system1/member-writes.ts";
import {
  LIVING_PROFILE_SELECT,
  livingProfileToRow,
  mapLivingProfileRow,
  memberLivingProfileDbPayload,
  roundTripLivingProfile,
} from "../system1/persistence.ts";
import { emptyLivingProfile } from "../system1/profile.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const NOW = new Date("2026-09-07T06:00:00.000Z");
const selection = {
  topics: [
    { id: "job_interview", customText: null },
    { id: "something_else", customText: "A board introduction" },
  ],
  audiences: ["recruiter_hr", "manager_boss"],
  pattern: "ramble",
  urgency: "this_week",
};

describe("Decision 060 catalogs", () => {
  it("preserves every approved stable ID and exact label", () => {
    assert.deepEqual(PRACTICE_TOPIC_CATALOG, [
      { id: "job_interview", label: "Job interview" },
      { id: "salary_raise_negotiation", label: "Salary / raise negotiation" },
      { id: "giving_difficult_feedback", label: "Giving difficult feedback" },
      { id: "setting_a_boundary", label: "Setting a boundary" },
      { id: "pitch_or_presentation", label: "Pitch or presentation" },
      { id: "handling_conflict", label: "Handling conflict" },
      { id: "asking_for_something_i_need", label: "Asking for something I need" },
      { id: "receiving_critical_feedback", label: "Receiving critical feedback" },
      { id: "ending_a_relationship", label: "Ending a relationship" },
      { id: "something_else", label: "Something else" },
    ]);
    assert.deepEqual(PRACTICE_AUDIENCE_CATALOG, [
      { id: "manager_boss", label: "Manager/boss" },
      { id: "peer_colleague", label: "Peer/colleague" },
      { id: "client_customer", label: "Client/customer" },
      { id: "recruiter_hr", label: "Recruiter/HR" },
      { id: "business_partner", label: "Business partner" },
      { id: "family_friend", label: "Family/friend" },
      { id: "stranger_new_contact", label: "Stranger/new contact" },
    ]);
    assert.deepEqual(PRACTICE_PATTERN_CATALOG, [
      { id: "freeze", label: "I freeze and don't know what to say" },
      { id: "ramble", label: "I ramble and lose the thread" },
      { id: "emotional_defensive", label: "I get emotional or defensive" },
      { id: "harsh_aggressive", label: "I sound too harsh or aggressive" },
      { id: "cave_under_pushback", label: "I cave as soon as they push back" },
      { id: "avoid_entirely", label: "I avoid the conversation entirely" },
    ]);
    assert.deepEqual(PRACTICE_URGENCY_CATALOG, [
      { id: "today", label: "Today" },
      { id: "this_week", label: "This week" },
      { id: "next_2_weeks", label: "In the next 2 weeks" },
      { id: "no_specific_deadline", label: "No specific deadline" },
    ]);
  });
});

describe("practice-profile validation and projection", () => {
  it("accepts ordered valid selections and projects from the first picks", () => {
    assert.deepEqual(validateMemberPracticeProfileSelection(selection), selection);
    assert.deepEqual(projectMemberPracticeProfile(selection), {
      mappingVersion: 1,
      focusAreas: {
        topics: ["Job interview", "A board introduction"],
        audiences: ["Recruiter/HR", "Manager/boss"],
        urgency: "This week",
      },
      patternTemplate:
        "You tend to ramble and lose the thread when the pressure rises.",
      initialForgeTarget: "Practice a job interview with Recruiter/HR.",
    });
  });

  it("selects only contract fields before validation and projection", () => {
    const wizard = {
      ...selection,
      sessionId: "draft_123",
      phase: 2,
      verified: false,
    };
    const selected = selectMemberPracticeProfileSelection(wizard);
    assert.deepEqual(selected, selection);
    assert.deepEqual(Object.keys(selected), [
      "topics",
      "audiences",
      "pattern",
      "urgency",
    ]);
    assert.deepEqual(validateMemberPracticeProfileSelection(selected), selection);
    assert.equal(
      projectMemberPracticeProfile(selected).initialForgeTarget,
      "Practice a job interview with Recruiter/HR."
    );
    assert.throws(
      () => validateMemberPracticeProfileSelection(wizard),
      PracticeProfileValidationError
    );
    assert.throws(
      () => projectMemberPracticeProfile(wizard),
      PracticeProfileValidationError
    );
  });

  it("checks completeness from wizard state without passing UI-only fields to strict validation", () => {
    assert.equal(
      isCompleteMemberPracticeProfileSelection({
        ...selection,
        sessionId: "draft_123",
        phase: 2,
        verified: false,
      }),
      true
    );
    assert.equal(
      isCompleteMemberPracticeProfileSelection({
        ...selection,
        urgency: null,
        sessionId: "draft_123",
        phase: 2,
        verified: false,
      }),
      false
    );
  });

  it("uses one governed member-facing diagnosis for every pattern", () => {
    const templates = {
      freeze: "You tend to freeze when the stakes are high.",
      ramble:
        "You tend to ramble and lose the thread when the pressure rises.",
      emotional_defensive:
        "You tend to get emotional or defensive when a conversation gets difficult.",
      harsh_aggressive:
        "You tend to sound too harsh or aggressive when you need to be heard.",
      cave_under_pushback: "You tend to cave when someone pushes back.",
      avoid_entirely:
        "You tend to avoid conversations that feel difficult.",
    };
    for (const [pattern, patternTemplate] of Object.entries(templates)) {
      assert.equal(
        projectMemberPracticeProfile({ ...selection, pattern }).patternTemplate,
        patternTemplate
      );
    }
  });

  it("builds deterministic structured Forge context from verified data only", () => {
    const verified = createVerifiedMemberPracticeProfile({
      selection,
      sourceSessionId: "draft_123",
      now: NOW,
    });
    assert.deepEqual(buildForgePracticeContext(verified), {
      source: "verified_member_practice_profile",
      catalogVersion: 1,
      primaryTopic: { id: "job_interview", label: "Job interview" },
      primaryAudience: { id: "recruiter_hr", label: "Recruiter/HR" },
      pattern: {
        id: "ramble",
        label: "I ramble and lose the thread",
      },
      urgency: { id: "this_week", label: "This week" },
    });
    assert.equal(buildForgePracticeContext(selection), null);
  });

  it("keeps the first topic and audience as a training intention", () => {
    const projection = projectMemberPracticeProfile({
      ...selection,
      topics: [{ id: "something_else", customText: "A board introduction" }],
      audiences: ["manager_boss", "recruiter_hr"],
      urgency: "next_2_weeks",
    });
    assert.equal(
      projection.initialForgeTarget,
      "Practice the moment “A board introduction” with Manager/boss."
    );
    assert.equal(projection.focusAreas.urgency, "In the next 2 weeks");
    assert.doesNotMatch(
      projection.initialForgeTarget,
      /guarantee|transform|master|become/i
    );
  });

  it("rejects cardinality drift, unknown IDs, duplicates, and misplaced custom text", () => {
    const invalid = [
      { ...selection, topics: [] },
      { ...selection, topics: [...selection.topics, ...selection.topics] },
      { ...selection, audiences: [] },
      { ...selection, audiences: ["recruiter_hr", "recruiter_hr"] },
      { ...selection, pattern: "invented" },
      {
        ...selection,
        topics: [{ id: "job_interview", customText: "not permitted" }],
      },
      {
        ...selection,
        topics: [
          {
            id: "something_else",
            customText: "x".repeat(PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH + 1),
          },
        ],
      },
    ];
    for (const value of invalid) {
      assert.throws(
        () => validateMemberPracticeProfileSelection(value),
        PracticeProfileValidationError
      );
    }
  });

  it("does not accept caller-owned timestamps or provenance as selection fields", () => {
    assert.throws(
      () =>
        validateMemberPracticeProfileSelection({
          ...selection,
          verifiedAt: "2020-01-01T00:00:00.000Z",
        }),
      PracticeProfileValidationError
    );
    const verified = createVerifiedMemberPracticeProfile({
      selection,
      sourceSessionId: "draft_123",
      now: NOW,
    });
    assert.equal(verified.verifiedAt, NOW.toISOString());
    assert.equal(verified.updatedAt, NOW.toISOString());
    assert.deepEqual(verified.provenance, {
      kind: "member_declared",
      source: "coach_card_wizard",
      sourceSessionId: "draft_123",
    });
  });
});

describe("Living Profile persistence and member authority", () => {
  it("adds the ordered deployable migration and reference column", () => {
    const name = "20260907_living_profile_member_practice_profile.sql";
    const sql = readFileSync(join(root, "supabase/migrations", name), "utf8");
    assert.match(
      sql,
      /member_practice_profile jsonb not null default '\{\}'::jsonb/
    );
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    assert.equal(manifest.deploymentPaths.greenfield.at(-1), name);
    assert.equal(manifest.deploymentPaths.existingProduction.at(-1), name);
    assert.match(
      readFileSync(join(root, "supabase/schema.sql"), "utf8"),
      /member_practice_profile jsonb not null default '\{\}'::jsonb/
    );
  });

  it("round-trips the JSONB field and maps an empty database object to absence", () => {
    const profile = applyMemberPracticeProfileUpdate(
      emptyLivingProfile("member_1", "Ari"),
      selection,
      { sourceSessionId: "draft_123", now: NOW }
    );
    const row = livingProfileToRow(profile);
    assert.deepEqual(row.member_practice_profile, profile.memberPracticeProfile);
    assert.deepEqual(roundTripLivingProfile(profile), profile);
    assert.equal(
      mapLivingProfileRow({
        user_id: "member_2",
        member_practice_profile: {},
      }).memberPracticeProfile,
      null
    );
    assert.match(LIVING_PROFILE_SELECT, /member_practice_profile/);
  });

  it("writes member provenance while preserving intelligence and omitting client authority", () => {
    const current = emptyLivingProfile("member_1", "Ari");
    current.evidenceLedger = [{ sentinel: "evidence" }];
    current.profileInsights = [{ sentinel: "insight" }];
    const next = applyMemberPracticeProfileUpdate(current, selection, {
      sourceSessionId: "draft_123",
      now: NOW,
    });
    assert.equal(next.provenance[0].sourceKind, "member_declared");
    assert.equal(next.provenance[0].fieldPath, "memberPracticeProfile");
    assert.deepEqual(next.evidenceLedger, current.evidenceLedger);
    assert.deepEqual(next.profileInsights, current.profileInsights);

    const payload = memberLivingProfileDbPayload(next);
    assert.deepEqual(payload.member_practice_profile, next.memberPracticeProfile);
    assert.equal("evidence_ledger" in payload, false);
    assert.equal("profile_insights" in payload, false);
  });
});
