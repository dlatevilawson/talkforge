import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasSubstantiveFounderSpeech } from "./session-substance.ts";

const session = readFileSync(new URL("./session.ts", import.meta.url), "utf8");
const arena = readFileSync(new URL("../app/components/VoiceArena.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("./session-recovery.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/journey/complete-day/route.ts", import.meta.url), "utf8");

test("saved turns use a substantive-speech completion gate", () => {
  assert.equal(hasSubstantiveFounderSpeech([{ role: "founder", text: "hello" }]), false);
  assert.equal(hasSubstantiveFounderSpeech([{ role: "founder", text: "I want to practice this" }]), true);
  assert.match(session, /hasSubstantiveFounderSpeech\(turns\)/);
  assert.match(route, /spoken_rep_required/);
  assert.match(route, /captured: false/);
  assert.match(route, /from\("speech_audio"\)/);
  assert.match(route, /hasSubstantiveTurns && !audio/);
});

test("text-only completion remains an explicit supported path", () => {
  assert.match(route, /!hasSession && body\.textOnly !== true/);
  assert.match(route, /practice_session_id: typeof body\.sessionId === "string" \? body\.sessionId : null/);
});

test("wrap failure cannot prevent completion", () => {
  assert.match(arena, /AbortController/);
  assert.match(arena, /momentumController\.abort/);
  assert.match(arena, /await persistCompletedVoiceSession\(snapshot, wrap\)/);
});

test("abandoned sessions have a durable recovery path and stale sweep", () => {
  assert.match(arena, /sendBeacon\("\/api\/session\/recover"/);
  assert.match(recovery, /recoverIncompleteSession/);
  assert.match(recovery, /recoverStaleIncompleteSessions/);
  assert.match(recovery, /last_activity_at/);
});

test("journey failure is isolated from report and memory work", () => {
  assert.match(session, /journey\] completion failed after session save/);
  assert.match(session, /saveSessionReport\(report\)/);
  assert.match(session, /canonical memory write failed/);
  assert.match(session, /api\/session\/recover/);
});

test("three repeated coach turns end the rep instead of looping", () => {
  assert.match(arena, /hasRepeatedCoachTurn\(next\)/);
  assert.match(arena, /handleStop\("coach_loop"\)/);
});
