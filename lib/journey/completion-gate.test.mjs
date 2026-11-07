import test from "node:test";
import assert from "node:assert/strict";
import { hasAdmittedPracticeSpeech } from "./completion-gate.ts";

test("no substantive admitted user speech keeps a day pending", () => {
  assert.equal(hasAdmittedPracticeSpeech([
    { role: "user", text: "um" },
    { role: "forge", text: "" },
  ]), false);
});

test("substantive admitted user speech permits completion", () => {
  assert.equal(hasAdmittedPracticeSpeech([
    { role: "user", text: "I want to explain the decision clearly" },
  ]), true);
});
