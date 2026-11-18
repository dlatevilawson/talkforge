import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMemberLivingProfileUpdate } from "./member-writes.ts";
import { emptyLivingProfile } from "./profile.ts";
import { memberLivingProfileDbPayload } from "./persistence.ts";

test("member check-in updates the bottleneck with provenance and persists it in the profile payload", () => {
  const current = emptyLivingProfile("member-1", "Latevi");
  const next = applyMemberLivingProfileUpdate(current, {
    memberDeclaredBottleneck: "I lose my point when interrupted.",
    matteringConversation: "Team presentation",
  });
  assert.equal(next.challenges[0], "I lose my point when interrupted.");
  assert.ok(next.provenance.some((record) => record.fieldPath === "challenges[0]" && record.sourceKind === "member_declared"));
  assert.ok(next.provenance.some((record) => record.fieldPath === "matteringConversation" && record.claim === "Team presentation"));
  assert.equal(memberLivingProfileDbPayload(next).challenges[0], "I lose my point when interrupted.");
});
