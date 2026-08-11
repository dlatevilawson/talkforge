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

function utter(state, text) {
  return reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text });
}

function fillAllRequired(state) {
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    ({ state } = utter(
      state,
      `Accepted diagnostic answer for ${id} with enough detail here.`
    ));
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

  it("sufficient snapshot maps F1=B F2=A F3=A", () => {
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
    assert.deepEqual(mapped.goals, [snap.answers.skill_to_improve]);
    // F1=B: six_week_success → purpose when empty, not goals
    assert.equal(mapped.purposeStatement, snap.answers.six_week_success);
    assert.ok(!mapped.goals.includes(snap.answers.six_week_success));

    // F2=A: where_it_shows_up is its own challenges entry
    assert.ok(mapped.challenges.includes(snap.answers.where_it_shows_up));
    assert.ok(mapped.challenges.includes(snap.answers.what_goes_wrong));
    assert.ok(mapped.challenges.includes(snap.answers.behavior_to_change));
    assert.ok(
      mapped.challenges.includes(snap.answers.recent_missed_conversation)
    );
    assert.equal(mapped.challenges.length, 4);

    // F3=A: do not clear presence on sufficient
    assert.equal(mapped.clearPresenceScores, false);
    assert.match(mapped.provenanceClaim, /Practice time/i);
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
    assert.deepEqual(mapped.goals, [snap.answers.skill_to_improve]);
  });

  it("insufficient / early-end clears presence and does not fabricate", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "Accepted diagnostic answer for skill_to_improve with enough detail here."
    ));
    ({ state } = utter(
      state,
      "Accepted diagnostic answer for where_it_shows_up with enough detail here."
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
  });
});
