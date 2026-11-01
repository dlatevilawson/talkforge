import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reflectDataIsReady } from "./reflect-readiness.ts";

describe("reflect first-load readiness", () => {
  const base = {
    sessionId: "session-1",
    modality: "voice",
    report: { coachSummary: "done" },
    speechMetrics: { fillerCount: 0 },
    memorySessionId: "session-1",
  };

  it("accepts post-completion state", () => {
    assert.equal(reflectDataIsReady(base), true);
  });

  it("rejects pre-completion state so the caller can keep finishing", () => {
    assert.equal(reflectDataIsReady({ ...base, report: null }), false);
    assert.equal(reflectDataIsReady({ ...base, memorySessionId: "old" }), false);
    assert.equal(reflectDataIsReady({ ...base, speechMetrics: null }), false);
  });

  it("does not require voice metrics for a text drill", () => {
    assert.equal(
      reflectDataIsReady({ ...base, modality: "text", speechMetrics: null }),
      true
    );
  });
});

