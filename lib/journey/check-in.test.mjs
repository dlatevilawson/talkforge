import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBlockCompletion, nextBlockStartDate } from "./check-in.ts";

test("a completed block is distinct from an empty or pending block", () => {
  assert.deepEqual(evaluateBlockCompletion(["done", "done"]), {
    completedDays: 2,
    totalDays: 2,
    blockComplete: true,
  });
  assert.equal(evaluateBlockCompletion(["done", "pending"]).blockComplete, false);
  assert.equal(evaluateBlockCompletion([]).blockComplete, false);
});

test("the next block starts the day after the completed block", () => {
  assert.equal(nextBlockStartDate("2026-11-08"), "2026-11-09");
});
