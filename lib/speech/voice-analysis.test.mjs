import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const completion = readFileSync(new URL("../../app/components/journey/TextDrillCompletion.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../../app/api/speech/measure/route.ts", import.meta.url), "utf8");
const completionRoute = readFileSync(new URL("../../app/api/journey/complete-day/route.ts", import.meta.url), "utf8");
const session = readFileSync(new URL("../session.ts", import.meta.url), "utf8");

test("spoken text drills require an explicit recording or text-only choice", () => {
  assert.match(completion, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(completion, /Record spoken rep/);
  assert.match(completion, /Complete text-only/);
  assert.match(completion, /persistSpeechCapture/);
  assert.match(completion, /api\/speech\/measure/);
  assert.match(completionRoute, /spoken_rep_required/);
  assert.match(completionRoute, /textOnly !== true/);
});

test("measurement is asynchronous and uses timestamped transcription", () => {
  assert.match(route, /audio\.transcriptions\.create/);
  assert.match(route, /timestamp_granularities: \["word"\]/);
  assert.match(route, /measurement failed/);
  assert.match(route, /measured: false/);
  assert.match(session, /api\/speech\/measure/);
});
