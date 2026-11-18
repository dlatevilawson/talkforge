import assert from "node:assert/strict";
import { test } from "node:test";
import { assessmentBaseline, READINESS_SIGNAL_NAMES } from "./assessment-baseline.ts";

test("an incomplete profile never presents a baseline", () => {
  const baseline = assessmentBaseline({ profileSource: "incomplete", updatedAt: "2026-11-17" });
  assert.equal(baseline.state, "learning");
  assert.equal(baseline.message, "We're still learning your starting point.");
});

test("captured baseline names all five signals with no invented measurements", () => {
  const baseline = assessmentBaseline({ profileSource: "assessment", updatedAt: "2026-11-17", challenges: ["I lose my thought when interrupted"] });
  assert.equal(baseline.state, "captured");
  assert.deepEqual(baseline.signals.map((signal) => signal.name), READINESS_SIGNAL_NAMES);
  assert.ok(baseline.signals.every((signal) => signal.evidence === "Not measured yet"));
  assert.ok(baseline.signals.every((signal) => typeof signal.evidence === "string"));
});
