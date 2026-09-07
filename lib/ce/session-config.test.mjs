import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("./session-config.ts", import.meta.url),
  "utf8"
);

describe("Realtime session configuration", () => {
  it("keeps titled practice context without retired handoff state", () => {
    assert.match(source, /They may be preparing for:/);
    assert.match(source, /They once said success looks like:/);
    assert.doesNotMatch(
      source,
      /handoffSource|buildAcPracticeObjectiveLines|isAcPracticeHandoff/
    );
  });

  it("keeps the configured Realtime and transcription models", () => {
    assert.match(
      source,
      /export const CE_REALTIME_MODEL = "gpt-realtime-2\.1"/
    );
    assert.match(
      source,
      /export const CE_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"/
    );
  });
});
