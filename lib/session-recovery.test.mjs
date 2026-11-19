import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applySessionCaptureVerdict,
  countMemberTranscriptFillers,
  hasSubstantiveFounderSpeech,
  memberSpeechTurns,
  reportMemoryEvidence,
} from "./session-substance.ts";
import { voiceTurnsToConversationTurns } from "./voice-turn-mapping.ts";

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

test("Day 12-shaped member turns cannot be nulled as an empty rep", () => {
  const memberTexts = [
    "Imagine a customer says the price I am quoting is unfair and too high.",
    "Yes, of course, hello.",
    "I hear it feels high. Here is what you are paying for and how it helps you.",
    "I hear you. It is...",
    "Oh, shoot.",
    "I hear it feels high. Here is what you pay for and how it helps you.",
    "Yes.",
    "Here is what you are paying for and here is how it helps you.",
    "Here is what you pay for and here is how I help you.",
    "I hear it feels high. Here is what you pay for and here is how I help you.",
    "Here is how I help you.",
    "Here is how I help you.",
    "Here is how it helps you.",
    "Here is how it helps you.",
    "Hello.",
    "Yeah, I thought you were not going to hear me for a second.",
    "Let us move up to handling the follow-up objection.",
    "Everything you said just went into the dark.",
    "I get that budget is tight. Here is what teams see when we use this.",
    "Why do not you go put it back?",
    "I get that the budget is tight, so here is what seems to get when we use it.",
    "Now, I think, all right, I have to run, so we can cut it over here.",
    "I am still thinking about the answer.",
    "The point I want to make is clear.",
  ];
  const turns = voiceTurnsToConversationTurns(memberTexts.flatMap((text) => [
    { role: "founder", text },
    { role: "forge", text: "Um, like, that is useful." },
  ]));
  const eligibleMemberTurns = turns.filter(
    (turn) => turn.role === "user" && hasSubstantiveFounderSpeech([turn])
  );
  assert.equal(turns.filter((turn) => turn.role === "user").length, 24);
  assert.equal(turns.filter((turn) => turn.role === "npc").length, 24);
  assert.equal(eligibleMemberTurns.length, 21);

  const captured = hasSubstantiveFounderSpeech(turns);
  const report = applySessionCaptureVerdict({
    overallScore: 72,
    confidence: 70,
    empathy: 70,
    listening: 70,
    clarity: 70,
    storytelling: 70,
    negotiation: 70,
    leadership: 70,
    breakthrough: "A real rep was captured.",
    biggestWeakness: "One next improvement.",
    coachSummary: "The member practiced.",
  }, captured);
  assert.equal(report.overallScore, 72);
  assert.equal(report.breakthrough, "A real rep was captured.");
  assert.equal(hasSubstantiveFounderSpeech(turns, { audioAvailable: true }), true);
  assert.match(session, /capturedSpeech,\s*\}\);/);

  const staleFallback = applySessionCaptureVerdict({
    overallScore: 55,
    confidence: 58,
    empathy: 55,
    listening: 55,
    clarity: 55,
    storytelling: null,
    negotiation: null,
    leadership: null,
    breakthrough: "No spoken rep was captured yet.",
    biggestWeakness: "We still need one full spoken thought to work with.",
    coachSummary: "No spoken rep was captured. Fix the audio path.",
  }, captured);
  assert.equal(staleFallback.breakthrough, "You showed up and practiced out loud.");
  assert.doesNotMatch(staleFallback.coachSummary, /no spoken rep was captured/i);
});

test("audio-backed member fragments count as captured, but counterpart text does not", () => {
  const turns = [
    { role: "user", text: "Yes." },
    { role: "npc", text: "Um, like, basically." },
  ];
  assert.equal(hasSubstantiveFounderSpeech(turns), false);
  assert.equal(hasSubstantiveFounderSpeech(turns, { audioAvailable: true }), true);
  assert.equal(
    hasSubstantiveFounderSpeech([{ role: "npc", text: "A long coach turn." }], { audioAvailable: true }),
    false
  );
  assert.equal(hasSubstantiveFounderSpeech([], { audioAvailable: true }), false);
});

test("filler counts and filler moments use member turns only", () => {
  const turns = [
    { role: "user", text: "Um, I, uh, like the idea." },
    { role: "npc", text: "Um, basically, that sounds good." },
  ];
  assert.equal(countMemberTranscriptFillers(turns), 3);
  const speechTurns = [
    { role: "founder", words: [{ word: "um" }] },
    { role: "forge", words: [{ word: "basically" }] },
  ];
  assert.deepEqual(memberSpeechTurns(speechTurns), [speechTurns[0]]);
  const persistence = readFileSync(new URL("./speech/persistence.ts", import.meta.url), "utf8");
  assert.match(persistence, /memberSpeechTurns\(input\.capture\.turns\)/);
});

test("no-capture report verdict is not persisted as a win or challenge", () => {
  const evidence = reportMemoryEvidence({
    breakthrough: "We didn’t capture a spoken thought in this session.",
    biggestWeakness: "No practice was captured; check the microphone.",
  });
  assert.deepEqual(evidence, { breakthrough: "", biggestWeakness: "" });
  const empty = applySessionCaptureVerdict({
    overallScore: 72,
    confidence: 70,
    empathy: 70,
    listening: 70,
    clarity: 70,
    storytelling: 70,
    negotiation: 70,
    leadership: 70,
    breakthrough: "A misleading win.",
    biggestWeakness: "A misleading challenge.",
    coachSummary: "A misleading summary.",
  }, false);
  assert.equal(empty.overallScore, null);
  assert.deepEqual(reportMemoryEvidence(empty), { breakthrough: "", biggestWeakness: "" });
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
