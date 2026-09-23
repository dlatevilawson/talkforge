import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessmentsAreComparable,
  comparisonLabel,
  deriveReadinessBand,
  MEMBER_READINESS_BAND_LABELS,
  MEMBER_READINESS_LEVEL_LABELS,
} from "./measurement.ts";

const signals = [
  "purpose",
  "perspective",
  "composure",
  "message",
  "adaptability",
];

function observations(levels, strength = "sufficient") {
  return signals.map((signal, index) => ({
    signal,
    level: levels[index] ?? null,
    nullReason:
      levels[index] === null || levels[index] === undefined
        ? "signal_not_applicable"
        : null,
    evidenceStrength:
      levels[index] === null || levels[index] === undefined
        ? "insufficient"
        : strength,
  }));
}

describe("readiness band derivation", () => {
  it("never derives an overall band for focused drills", () => {
    const result = deriveReadinessBand({
      purpose: "drill",
      observations: observations([4, 4, 4, 4, 4]),
    });
    assert.deepEqual(result, {
      status: "not_derived",
      reason: "session_not_band_eligible",
      observedSignals: 5,
    });
  });

  it("requires four signals with sufficient evidence", () => {
    const result = deriveReadinessBand({
      purpose: "diagnostic",
      observations: observations([3, 3, 3, null, null]),
    });
    assert.equal(result.status, "not_derived");
    assert.equal(result.reason, "insufficient_evidence");
  });

  it("does not count limited evidence toward an overall band", () => {
    const result = deriveReadinessBand({
      purpose: "check_in",
      observations: observations([4, 4, 4, 4, 4], "limited"),
    });
    assert.equal(result.status, "not_derived");
    assert.equal(result.observedSignals, 0);
  });

  it("a single breakdown stays Building Baseline", () => {
    const result = deriveReadinessBand({
      purpose: "emergency",
      observations: observations([0, 4, 4, 4, 4]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "building_baseline");
    assert.equal(result.focusSignal, "purpose");
  });

  it("one fragile signal and no breakdown becomes One Focus Area", () => {
    const result = deriveReadinessBand({
      purpose: "free_practice",
      observations: observations([4, 4, 4, 4, 1]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "one_focus_area");
    assert.equal(result.focusSignal, "adaptability");
  });

  it("two fragile signals become Building Baseline", () => {
    const result = deriveReadinessBand({
      purpose: "diagnostic",
      observations: observations([1, 1, 3, 3, null]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "building_baseline");
  });

  it("derives Sustained in Practice without claiming real-world readiness", () => {
    const result = deriveReadinessBand({
      purpose: "check_in",
      observations: observations([4, 4, 3, 3, 3]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "sustained_in_practice");
  });

  it("derives Solid Ground from comparable demonstrated signals", () => {
    const result = deriveReadinessBand({
      purpose: "check_in",
      observations: observations([3, 3, 2, 2, null]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "solid_ground");
  });

  it("falls back to Early Reps when no higher rule matches", () => {
    const result = deriveReadinessBand({
      purpose: "diagnostic",
      observations: observations([2, 2, 2, 2, null]),
    });
    assert.equal(result.status, "derived");
    assert.equal(result.band, "early_reps");
  });
});

describe("readiness comparability", () => {
  const baseline = {
    rubricVersion: "v1.0",
    scenarioFamily: "difficult_feedback",
    modality: "voice",
    purpose: "check_in",
    pressureLevel: "moderate",
  };

  it("requires the same scenario, modality, purpose, pressure, and rubric major", () => {
    assert.equal(assessmentsAreComparable(baseline, { ...baseline }), true);
    assert.equal(
      assessmentsAreComparable(baseline, {
        ...baseline,
        scenarioFamily: "interview",
      }),
      false
    );
    assert.equal(
      assessmentsAreComparable(baseline, {
        ...baseline,
        pressureLevel: "high",
      }),
      false
    );
    assert.equal(
      assessmentsAreComparable(baseline, {
        ...baseline,
        rubricVersion: "v2.0",
      }),
      false
    );
  });

  it("distinguishes a comparison from a trend", () => {
    assert.equal(comparisonLabel(1), "none");
    assert.equal(comparisonLabel(2), "comparison");
    assert.equal(comparisonLabel(3), "trend");
  });
});

describe("member-facing language", () => {
  it("uses practice language, not a score or guaranteed outcome", () => {
    const copy = JSON.stringify({
      ...MEMBER_READINESS_LEVEL_LABELS,
      ...MEMBER_READINESS_BAND_LABELS,
    });
    assert.doesNotMatch(copy, /score|battle-tested|ready for the real moment/i);
    assert.match(copy, /Sustained in Practice/);
    assert.match(copy, /One Focus Area/);
  });
});
