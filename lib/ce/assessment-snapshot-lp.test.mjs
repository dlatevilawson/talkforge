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

const USEFUL_SLOT_ANSWERS = {
  skill_to_improve:
    "I want to get my thoughts out clearly when I present to leadership at work.",
  where_it_shows_up: "It shows up most in weekly team meetings at work.",
  what_goes_wrong:
    "I freeze and lose my train of thought when someone puts me on the spot.",
  behavior_to_change:
    "I tend to ramble and over-explain instead of getting to the point.",
  recent_missed_conversation:
    "Yesterday my manager asked a question in a meeting and I blanked completely.",
  six_week_success:
    "I want to be able to answer clearly in meetings without freezing.",
  practice_time: "About ten minutes each day is realistic for me.",
};

function fillAllRequired(state) {
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    ({ state } = utter(state, USEFUL_SLOT_ANSWERS[id]));
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
    // Coach V2: LP lines are polished from accepted answers (no invented facts).
    assert.equal(mapped.goals.length, 1);
    assert.match(mapped.goals[0], /thoughts out clearly/i);
    // F1=B: six_week_success → purpose when empty, not goals
    assert.match(mapped.purposeStatement, /answer clearly in meetings/i);
    assert.ok(!mapped.goals.includes(snap.answers.six_week_success));

    // F2=A: four challenge slots mapped (polished from accepted answers)
    assert.equal(mapped.challenges.length, 4);
    assert.ok(mapped.challenges.some((c) => /team meetings/i.test(c)));
    assert.ok(mapped.challenges.some((c) => /freeze|train of thought/i.test(c)));
    assert.ok(mapped.challenges.some((c) => /ramble|over-explain/i.test(c)));
    assert.ok(mapped.challenges.some((c) => /manager asked|blanked/i.test(c)));

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
    assert.equal(mapped.goals.length, 1);
    assert.match(mapped.goals[0], /thoughts out clearly/i);
  });

  it("insufficient / early-end clears presence and does not fabricate", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(state, USEFUL_SLOT_ANSWERS.skill_to_improve));
    ({ state } = utter(state, USEFUL_SLOT_ANSWERS.where_it_shows_up));
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
