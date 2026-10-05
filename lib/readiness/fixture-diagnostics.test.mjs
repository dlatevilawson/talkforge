import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_READINESS_FIXTURE_TIMEOUT_MS,
  createFixtureFailureRecord,
  estimateFixtureCostUsd,
  parseBoundedInteger,
  sanitizeOpenAIError,
  summarizeFixtureStability,
} from "./fixture-diagnostics.ts";
import { SHADOW_BOUNDARY_FIXTURES } from "./shadow-fixtures.ts";

const output = (purposeLevel = 2) => ({
  pressureLevel: "moderate",
  pressureEvidenceTurnIds: ["turn-2"],
  signals: ["purpose", "perspective", "composure", "message", "adaptability"].map(
    (signal) => ({
      signal,
      level: signal === "purpose" ? purposeLevel : 2,
      nullReason: null,
      evidenceStrength: "sufficient",
      summary: "Current-session evidence.",
      evidence: [],
    })
  ),
});

describe("readiness fixture diagnostics", () => {
  it("keeps only allowlisted provider metadata", () => {
    class APIConnectionTimeoutError extends Error {}
    const error = new APIConnectionTimeoutError("secret prompt content");
    Object.assign(error, {
      type: "request_timeout",
      code: "timeout",
      status: 408,
      requestID: "req_123",
      details: "member transcript",
      headers: { authorization: "secret" },
    });

    assert.deepEqual(sanitizeOpenAIError(error), {
      providerErrorClass: "APIConnectionTimeoutError",
      providerErrorType: "request_timeout",
      providerErrorCode: "timeout",
      providerStatus: 408,
      providerRequestId: "req_123",
    });
    assert.doesNotMatch(
      JSON.stringify(sanitizeOpenAIError(error)),
      /secret|prompt|transcript|authorization/
    );
  });

  it("keeps every fixture failure mode free of transcript content", () => {
    const reasonCodes = [
      "PRESSURE_MISMATCH",
      "NULL_VIOLATION",
      "INJECTION_AS_EVIDENCE",
      "LEVEL_OFF_BY_N",
      "FORBIDDEN_LANGUAGE",
      "EVIDENCE_UNTRACEABLE",
      "SCHEMA_INVALID",
    ];
    const records = reasonCodes.map((reasonCode, index) =>
      createFixtureFailureRecord({
        fixtureId: `fixture-${index}`,
        signal: index === 0 ? "pressure" : "output",
        expected: index === 0 ? "pressure>=high" : "schema:valid",
        actual: index === 0 ? "pressure:moderate" : "validation:failed",
        reasonCode,
        note: "sanitized_metadata_only",
      })
    );
    const serialized = JSON.stringify(records).toLowerCase();
    const transcriptUtterances = SHADOW_BOUNDARY_FIXTURES.flatMap((fixture) =>
      fixture.input.transcript.map((turn) => turn.text.toLowerCase())
    );
    for (const utterance of transcriptUtterances) {
      assert.equal(serialized.includes(utterance), false, utterance);
    }
    assert.throws(() =>
      createFixtureFailureRecord({
        fixtureId: "fixture-unsafe",
        signal: "output",
        expected: "schema:valid",
        actual: 'member said: "private transcript text"',
        reasonCode: "SCHEMA_INVALID",
      })
    );
  });

  it("bounds the configurable timeout", () => {
    assert.equal(
      parseBoundedInteger(undefined, DEFAULT_READINESS_FIXTURE_TIMEOUT_MS, 30_000, 300_000),
      120_000
    );
    assert.equal(parseBoundedInteger("180000", 120_000, 30_000, 300_000), 180_000);
    assert.throws(() => parseBoundedInteger("29999", 120_000, 30_000, 300_000));
    assert.throws(() => parseBoundedInteger("nope", 120_000, 30_000, 300_000));
  });

  it("estimates cost only when explicit rates are supplied", () => {
    assert.equal(estimateFixtureCostUsd(1_000, 500, null), null);
    assert.equal(
      estimateFixtureCostUsd(1_000_000, 500_000, {
        inputUsdPerMillion: 1.25,
        outputUsdPerMillion: 10,
      }),
      6.25
    );
  });

  it("reports exact and within-one-level stability across three runs", () => {
    const stable = summarizeFixtureStability([
      { id: "fixture-a", run: 1, output: output(2) },
      { id: "fixture-a", run: 2, output: output(2) },
      { id: "fixture-a", run: 3, output: output(3) },
    ]);
    assert.equal(stable.evaluable, true);
    assert.equal(stable.signalCells, 5);
    assert.equal(stable.assessedVsNullPercent, 100);
    assert.equal(stable.exactEvidenceStrengthPercent, 100);
    assert.equal(stable.exactLevelPercent, 80);
    assert.equal(stable.withinOneLevelPercent, 100);
  });

  it("does not call repeated request failures evaluator stability", () => {
    const failed = summarizeFixtureStability([
      { id: "fixture-a", run: 1, output: null },
      { id: "fixture-a", run: 2, output: null },
      { id: "fixture-a", run: 3, output: null },
    ]);
    assert.equal(failed.evaluable, false);
    assert.equal(failed.signalCells, 0);
    assert.deepEqual(failed.notEvaluable, ["fixture-a"]);
  });
});
