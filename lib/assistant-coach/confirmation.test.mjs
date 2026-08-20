/**
 * Confirmation view + first Forge href. Does not expand Forge.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyConfirmationToLivingProfile,
  buildConfirmationView,
  buildFirstPracticeHref,
} from "./confirmation.ts";
import { handleAssistantCoachConfirmRequest } from "./http-confirm.ts";
import { emptyLivingProfile } from "../system1/profile.ts";
import { addProfileEvidence } from "../system1/profile-evidence.ts";

const NOW = "2026-08-20T12:00:00.000Z";

function ev(id, text, category) {
  return addProfileEvidence([], {
    id,
    userId: "u1",
    sourceType: "assistant_coach",
    sourceId: id,
    observedAt: NOW,
    text,
    category,
    confidence: "high",
  })[0];
}

describe("Confirmation view", () => {
  it("maps interview evidence into the four human fields", () => {
    const profile = emptyLivingProfile("u1", "Avery");
    profile.evidenceLedger = [
      ev("g", "Job interview coming up and wants to be prepared", "communication_goal"),
      ev("f", "You sometimes blank when you’re put on the spot", "communication_friction"),
      ev(
        "m",
        "Tell me about yourself and why should we hire you can trigger the fog",
        "lived_example"
      ),
    ];
    const view = buildConfirmationView(profile);
    assert.match(view.workingOn, /interview/i);
    assert.match(view.difficulty, /blank|fog|spot/i);
    assert.match(view.identifiedMoment, /tell me about yourself/i);
    assert.equal(view.canContinue, true);
  });

  it("Looks right does not invent purpose; Forge href carries the moment", () => {
    const profile = emptyLivingProfile("u1", "Avery");
    profile.purposeStatement = "";
    profile.evidenceLedger = [
      ev("g", "Job interview preparation", "communication_goal"),
    ];
    const fields = {
      workingOn: "Job interview preparation",
      difficulty: "Blanking when put on the spot",
      identifiedMoment: "Tell me about yourself",
      firstWork: "Stay clear on open-ended interview questions",
    };
    const next = applyConfirmationToLivingProfile(profile, fields, new Date(NOW));
    assert.equal(next.purposeStatement, "");
    assert.equal(next.goals[0], "Job interview preparation");
    assert.ok(
      next.provenance.some((p) => p.sourceKind === "confirmed_by_member")
    );
    const href = buildFirstPracticeHref(fields);
    assert.match(href, /^\/app\/practice\?/);
    assert.match(href, /Tell\+me\+about\+yourself|Tell%20me%20about%20yourself/);
    assert.doesNotMatch(href, /VoiceArena|forge-core|philosophy/);
  });
});

describe("HTTP confirm", () => {
  it("returns practiceHref and keeps purpose untouched", async () => {
    let saved = emptyLivingProfile("auth-user", "Pat");
    saved.purposeStatement = "Keep my own purpose.";
    saved.evidenceLedger = [
      ev("g", "Job interview coming up", "communication_goal"),
    ];
    const res = await handleAssistantCoachConfirmRequest(
      new Request("http://local/api/assistant-coach/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workingOn: "Job interview preparation",
          difficulty: "Brain fog on the spot",
          identifiedMoment: "Tell me about yourself",
          firstWork: "Stay structured on the opener",
        }),
      }),
      {
        async resolveAuthUserId() {
          return "auth-user";
        },
        async loadProfile() {
          return saved;
        },
        async saveConfirmedProfile(profile) {
          saved = profile;
          return profile;
        },
      }
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.practiceHref, /\/app\/practice/);
    assert.match(body.practiceHref, /start=1/);
    assert.equal(saved.purposeStatement, "Keep my own purpose.");
  });

  it("401 without auth", async () => {
    const res = await handleAssistantCoachConfirmRequest(
      new Request("http://local/api/assistant-coach/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workingOn: "x" }),
      }),
      {
        async resolveAuthUserId() {
          return null;
        },
        async loadProfile() {
          return null;
        },
        async saveConfirmedProfile(p) {
          return p;
        },
      }
    );
    assert.equal(res.status, 401);
  });
});
