import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./realtime.ts", import.meta.url), "utf8");

test("microphone recovery accepts the desired outbound state", () => {
  assert.match(source, /onMicTrackEnded\?: \(\) => void,\s*outboundEnabled = false/);
  assert.match(source, /outbound\.enabled = outboundEnabled/);
});
