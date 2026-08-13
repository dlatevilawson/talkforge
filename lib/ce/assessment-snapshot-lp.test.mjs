import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSESSMENT_REQUIRED_SLOTS,
  ASSESSMENT_SLOT_ORDER,
  buildAssessmentSnapshot,
  createIdleAssessmentState,
  mapAssessmentSnapshotToLivingProfile,
  parseAssessmentSnapshot,
  reduceAssessmentLifecycle,
} from "./assessment-lifecycle.ts";
import { ASSESSMENT_TEST_SLOT_ANSWERS } from "./assessment-test-answers.mjs";

function utter(state, text) {
  return reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text });
}

function fillAllRequired(state) {
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    ({ state } = utter(state, ASSESSMENT_TEST_SLOT_ANSWERS[id]));
  }
  return state;
}

describe("assessment snapshot → LP mapper (Step 7)", () => {
  it("parseAssessmentSnapshot rejects invalid shapes", () => {
    assert.equal(parseAssessmentSnapshot(null), null);
    assert.equal(parseAssessmentSnapshot({ version: 2 }), null);
    assert.equal(
      parseAssessmentSnapshot({
        version: 1,
        answers: {},
        sufficient: true,
        consented: true,
      }),
      null
    );
  });

  it("sufficient snapshot maps diagnosis into LP (not raw slot echo)", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    state = fillAllRequired(state);
    const snap = buildAssessmentSnapshot(state, { sufficient: true });
    const mapped = mapAssessmentSnapshotToLivingProfile(snap, {
      purposeStatement: "",
    });

    assert.equal(mapped.ready, true);
    assert.equal(mapped.profileSource, "assessment");
    assert.ok(snap.diagnosis);
    assert.deepEqual(mapped.goals, [snap.diagnosis.primaryBottleneck]);
    assert.equal(mapped.purposeStatement, snap.diagnosis.desiredOutcome);
    assert.ok(mapped.challenges.includes(snap.diagnosis.contexts));
    assert.ok(
      mapped.challenges.includes(snap.diagnosis.supportingPatterns[0])
    );
    assert.ok(mapped.challenges.includes(snap.diagnosis.evidence));
    assert.equal(mapped.clearPresenceScores, false);
    assert.match(mapped.provenanceClaim, /Practice/i);
    assert.doesNotMatch(mapped.goals[0], /^communicate better$/i);
  });

  it("F1=B skips purpose when purpose already set", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    state = fillAllRequired(state);
    const snap = buildAssessmentSnapshot(state, { sufficient: true });
    const mapped = mapAssessmentSnapshotToLivingProfile(snap, {
      purposeStatement: "Already declared purpose",
    });
    assert.equal(mapped.purposeStatement, null);
    assert.deepEqual(mapped.goals, [snap.diagnosis.primaryBottleneck]);
  });

  it("insufficient / early-end clears presence and does not fabricate", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      ASSESSMENT_TEST_SLOT_ANSWERS.skill_to_improve
    ));
    ({ state } = utter(
      state,
      ASSESSMENT_TEST_SLOT_ANSWERS.where_it_shows_up
    ));
    const snap = buildAssessmentSnapshot(state, { sufficient: false });
    const mapped = mapAssessmentSnapshotToLivingProfile(snap, {
      purposeStatement: "",
    });
    assert.equal(mapped.ready, false);
    assert.equal(mapped.profileSource, "incomplete");
    assert.equal(mapped.goals, null);
    assert.equal(mapped.challenges, null);
    assert.equal(mapped.purposeStatement, null);
    assert.equal(mapped.clearPresenceScores, true);
  });

  it("missing snapshot is incomplete — no invention", () => {
    const mapped = mapAssessmentSnapshotToLivingProfile(null, {
      purposeStatement: "",
    });
    assert.equal(mapped.ready, false);
    assert.equal(mapped.profileSource, "incomplete");
    assert.equal(mapped.clearPresenceScores, true);
  });

  it("sufficient flag alone is not enough without required answers", () => {
    const fake = {
      version: 1,
      answers: { skill_to_improve: "Only one slot filled with detail here" },
      filledSlotIds: ["skill_to_improve"],
      consented: true,
      sufficient: true,
      practiceSessionId: null,
      completedAt: "2026-08-11T00:00:00.000Z",
    };
    const mapped = mapAssessmentSnapshotToLivingProfile(fake, {
      purposeStatement: "",
    });
    assert.equal(mapped.ready, false);
    assert.equal(mapped.profileSource, "incomplete");
  });

  it("round-trips parse of buildAssessmentSnapshot", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    state = fillAllRequired(state);
    const snap = buildAssessmentSnapshot(state, { sufficient: true });
    const parsed = parseAssessmentSnapshot(JSON.parse(JSON.stringify(snap)));
    assert.ok(parsed);
    assert.equal(parsed.filledSlotIds.length, ASSESSMENT_SLOT_ORDER.length);
    assert.ok(parsed.diagnosis);
  });
});
