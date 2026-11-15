import test from "node:test";
import assert from "node:assert/strict";
import { hasRepeatedCoachTurn } from "./coach-loop.ts";

test("three identical coach turns trigger loop detection", () => {
  assert.equal(hasRepeatedCoachTurn([
    { role: "forge", text: "It starts with a simple checklist." },
    { role: "forge", text: " It starts with a simple checklist. " },
    { role: "forge", text: "It starts with a simple checklist." },
  ]), true);
});

test("a mixed or two-turn exchange is not a loop", () => {
  assert.equal(hasRepeatedCoachTurn([
    { role: "forge", text: "One." },
    { role: "founder", text: "Again." },
    { role: "forge", text: "One." },
  ]), false);
});
