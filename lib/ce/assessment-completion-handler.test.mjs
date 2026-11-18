import assert from "node:assert/strict";
import { test } from "node:test";
import { handleAssessmentCompletion } from "./assessment-completion-handler.ts";
import { ASSESSMENT_SLOT_ORDER, buildAssessmentSnapshot, reduceAssessmentLifecycle, startAssessmentLifecycle } from "./assessment-lifecycle.ts";
import { ASSESSMENT_TEST_SLOT_ANSWERS } from "./assessment-test-answers.mjs";

function emptyProfileRow() {
  return {
    user_id: "member-1", version: 1, display_name: "Latevi", preferred_nickname: "",
    purpose_statement: "", personal_principles: [], seasons: [], mattering_conversation_ids: [],
    provenance: [], evidence_ledger: [], profile_insights: [], presence_scores: null,
    goals: [], strengths: [], challenges: [], profile_source: "quick_pick", updated_at: "2026-11-17T00:00:00Z",
  };
}

function makeClient({ profile, plan = { id: "plan-1", daily_minutes: null } }) {
  const db = {
    from(table) {
      let operation = "select";
      let payload = null;
      const chain = {
        select() { return this; },
        eq() { return this; },
        update(value) { operation = "update"; payload = value; return this; },
        async maybeSingle() {
          if (table === "living_profiles" && operation === "select") return { data: profile, error: null };
          if (table === "living_profiles" && operation === "update") {
            profile = { ...profile, ...payload };
            return { data: profile, error: null };
          }
          if (table === "training_plans" && operation === "select") return { data: plan, error: null };
          return { data: null, error: null };
        },
        then(resolve, reject) {
          if (table === "training_plans" && operation === "update") {
            plan = { ...plan, ...payload };
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  return { db, get plan() { return plan; }, get profile() { return profile; } };
}

test("real assessment completion handler persists an incomplete snapshot for resume and writes back practice time", async () => {
  const profile = emptyProfileRow();
  const member = makeClient({ profile });
  const admin = makeClient({ profile: {}, plan: { id: "plan-1", daily_minutes: null } });
  const snapshot = {
    version: 1,
    answers: { skill_to_improve: "I want to speak clearly", where_it_shows_up: "Team meetings", what_goes_wrong: "I lose my thought", practice_time: "10 minutes each day" },
    filledSlotIds: ["skill_to_improve", "where_it_shows_up", "what_goes_wrong", "practice_time"],
    answerSources: { practice_time: "user" },
    consented: true, sufficient: false, practiceSessionId: "session-1", completedAt: "2026-11-17T00:00:00Z",
  };
  const response = await handleAssessmentCompletion(new Request("https://talkforge.test/api/assessment/complete", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentSnapshot: snapshot, turns: [] }),
  }), {
    requireUser: async () => ({ ok: true, userId: "member-1" }),
    createMemberClient: async () => member.db,
    createAdminClient: () => admin.db,
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.profileSource, "incomplete");
  assert.equal(member.profile.profile_source, "incomplete");
  assert.equal(JSON.parse(member.profile.provenance[0].claim).answers.what_goes_wrong, "I lose my thought");
  assert.equal(admin.plan.daily_minutes, 10);
});

test("completed assessment preserves the member's bottleneck wording as the first challenge", async () => {
  let state = startAssessmentLifecycle();
  ({ state } = reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text: "yes" }));
  for (const id of ASSESSMENT_SLOT_ORDER) {
    ({ state } = reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text: ASSESSMENT_TEST_SLOT_ANSWERS[id] }));
  }
  const snapshot = buildAssessmentSnapshot(state, { sufficient: true });
  // Exercise the real route with a raw member answer. Lifecycle test turns
  // may be projected into canonical fixture values before snapshot creation.
  snapshot.answers.what_goes_wrong = "I go blank under pressure and can't find the words";
  snapshot.filledSlotIds = [...new Set([...snapshot.filledSlotIds, "what_goes_wrong"] )];
  snapshot.answerSources = { ...snapshot.answerSources, what_goes_wrong: "user" };
  const profile = emptyProfileRow();
  const member = makeClient({ profile });
  const response = await handleAssessmentCompletion(new Request("https://talkforge.test/api/assessment/complete", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentSnapshot: snapshot, turns: [] }),
  }), {
    requireUser: async () => ({ ok: true, userId: "member-1" }),
    createMemberClient: async () => member.db,
    createAdminClient: () => makeClient({ profile: {} }).db,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ready, true);
  assert.equal(member.profile.challenges[0], "I go blank under pressure and can't find the words");
});
