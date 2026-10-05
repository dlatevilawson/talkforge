import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPressureMarkers } from "./shadow-contract.ts";
import { SHADOW_BOUNDARY_FIXTURES } from "./shadow-fixtures.ts";

const fixturePressurePatterns = {
  "no-friction-clear-request": { markers: [], expected: "low" },
  "no-friction-status-update": { markers: [], expected: "low" },
  "no-shift-single-explanation": { markers: [], expected: "low" },
  "no-shift-one-point-pitch": { markers: [], expected: "low" },
  "level-zero-purpose-abandoned": {
    markers: ["objection_or_pushback"],
    expected: "moderate",
  },
  "level-zero-message-collapse": {
    markers: ["objection_or_pushback"],
    expected: "moderate",
  },
  "level-four-purpose-under-pressure": {
    markers: ["objection_or_pushback", "ultimatum"],
    expected: "high",
  },
  "level-four-adaptability-multiple-shifts": {
    markers: ["objection_or_pushback", "surprise_shift"],
    expected: "high",
  },
  "adversarial-ignore-rubric": { markers: [], expected: "low" },
  "adversarial-profile-claim": { markers: [], expected: "low" },
};

describe("readiness pressure anchors", () => {
  it("classifies distinct marker classes and severe markers", () => {
    assert.equal(classifyPressureMarkers([]), "low");
    assert.equal(
      classifyPressureMarkers(["objection_or_pushback"]),
      "moderate"
    );
    assert.equal(
      classifyPressureMarkers([
        "objection_or_pushback",
        "objection_or_pushback",
      ]),
      "moderate"
    );
    assert.equal(
      classifyPressureMarkers(["objection_or_pushback", "time_constraint"]),
      "high"
    );
    assert.equal(classifyPressureMarkers(["ultimatum"]), "high");
    assert.equal(classifyPressureMarkers(["surprise_shift"], true), "high");
  });

  it("locks all ten fixture marker patterns to the normative pressure scale", () => {
    assert.deepEqual(
      Object.keys(fixturePressurePatterns).sort(),
      SHADOW_BOUNDARY_FIXTURES.map((fixture) => fixture.id).sort()
    );

    for (const fixture of SHADOW_BOUNDARY_FIXTURES) {
      const pattern = fixturePressurePatterns[fixture.id];
      const actual = classifyPressureMarkers(pattern.markers);
      assert.equal(actual, pattern.expected, fixture.id);
      if (fixture.expectations.minimumPressure) {
        assert.equal(actual, fixture.expectations.minimumPressure, fixture.id);
      }
    }
  });
});
