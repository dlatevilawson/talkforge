import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { buildResumeOpeningSpeechInstructions } from "../coach/philosophy.ts";
import {
  buildResumeBrief,
  isPracticeResumeEligible,
  loadEligibleVoiceResume,
  PRACTICE_RESUME_WINDOW_MS,
  resumeMatchesArena,
} from "./session-resume.ts";

const arena = readFileSync(
  new URL("../../app/components/VoiceArena.tsx", import.meta.url),
  "utf8"
);
const realtime = readFileSync(
  new URL("./realtime.ts", import.meta.url),
  "utf8"
);

describe("signed-in Forge session resume", () => {
  it("requires recent incomplete turns", () => {
    const now = Date.parse("2026-09-09T17:00:00.000Z");
    assert.equal(
      isPracticeResumeEligible({
        turns: [{ text: "hello" }],
        updatedAt: "2026-09-09T16:30:00.000Z",
        nowMs: now,
      }),
      true
    );
    assert.equal(
      isPracticeResumeEligible({
        turns: [],
        updatedAt: "2026-09-09T16:30:00.000Z",
        nowMs: now,
      }),
      false
    );
    assert.equal(
      isPracticeResumeEligible({
        turns: [{ text: "hello" }],
        updatedAt: "2026-09-09T14:00:00.000Z",
        nowMs: now,
        windowMs: PRACTICE_RESUME_WINDOW_MS,
      }),
      false
    );
    assert.equal(
      isPracticeResumeEligible({
        turns: [{ text: "hello" }],
        updatedAt: "2026-09-09T16:30:00.000Z",
        completedAt: "2026-09-09T16:40:00.000Z",
        nowMs: now,
      }),
      false
    );
  });

  it("loads an incomplete transcript by active id and rejects expired or mismatched rows", () => {
    const now = Date.parse("2026-09-09T17:00:00.000Z");
    const record = {
      turns: [{ text: "hello" }],
      updatedAt: "2026-09-09T16:30:00.000Z",
      track: "hello",
      eventTitle: "Salary negotiation",
    };
    assert.equal(
      loadEligibleVoiceResume({
        getActiveId: () => "voice_1",
        getRecord: (id) => (id === "voice_1" ? record : null),
        track: "hello",
        eventTitle: "Salary negotiation",
        nowMs: now,
      }),
      record
    );
    assert.equal(
      loadEligibleVoiceResume({
        getActiveId: () => null,
        getRecord: () => record,
        nowMs: now,
      }),
      null
    );
    assert.equal(
      loadEligibleVoiceResume({
        getActiveId: () => "voice_1",
        getRecord: () => record,
        track: "hello",
        eventTitle: "Job interview",
        nowMs: now,
      }),
      null
    );
    assert.equal(
      loadEligibleVoiceResume({
        getActiveId: () => "voice_1",
        getRecord: () => ({
          ...record,
          updatedAt: "2026-09-09T14:00:00.000Z",
        }),
        track: "hello",
        eventTitle: "Salary negotiation",
        nowMs: now,
      }),
      null
    );
  });

  it("does not resume into a different scenario", () => {
    assert.equal(
      resumeMatchesArena(
        { track: "hello", eventTitle: "Salary negotiation" },
        { track: "hello", eventTitle: "Salary negotiation" }
      ),
      true
    );
    assert.equal(
      resumeMatchesArena(
        { track: "hello", eventTitle: "Salary negotiation" },
        { track: "hello", eventTitle: "Job interview" }
      ),
      false
    );
  });

  it("builds a bounded resume brief from recent turns", () => {
    const brief = buildResumeBrief([
      {
        turnIndex: 0,
        role: "forge",
        text: "What is at stake in this conversation?",
        finalizedAt: "2026-09-09T16:00:00.000Z",
        sourceEvent: "test",
      },
      {
        turnIndex: 1,
        role: "founder",
        text: "I need to tell my manager the project is slipping.",
        finalizedAt: "2026-09-09T16:00:10.000Z",
        sourceEvent: "test",
      },
    ]);
    assert.match(brief, /Forge: What is at stake/);
    assert.match(brief, /Member: I need to tell my manager/);

    const longTurns = Array.from({ length: 12 }, (_, i) => ({
      turnIndex: i,
      role: i % 2 === 0 ? "founder" : "forge",
      text: `turn-${i} ${"word ".repeat(120)}`,
      finalizedAt: "2026-09-09T16:00:00.000Z",
      sourceEvent: "test",
    }));
    const bounded = buildResumeBrief(longTurns);
    assert.equal(bounded.split("\n").length, 8);
    assert.doesNotMatch(bounded, /turn-3/);
    assert.match(bounded, /turn-11/);
    for (const line of bounded.split("\n")) {
      assert.ok(line.length <= 420, line.length);
    }
  });

  it("opens resumed practice as a continuation, not a first session", () => {
    const text = buildResumeOpeningSpeechInstructions({
      resumeBrief: "Member: The ask is a raise.\nForge: Say the number.",
      eventTitle: "Salary negotiation",
    });
    assert.match(text, /resumed conversation/i);
    assert.match(text, /Salary negotiation/);
    assert.match(text, /Say the number/);
    assert.doesNotMatch(text, /what brought them in/i);
    assert.doesNotMatch(text, /First session energy/);
  });

  it("keeps the active session pointer across unmount and reconnects with resume context", () => {
    const unmountStart = arena.indexOf("mountedRef.current = false");
    const unmount = arena.slice(
      unmountStart,
      arena.indexOf("}, [isGuestPreview]);", unmountStart)
    );
    assert.doesNotMatch(unmount, /setActiveVoiceSessionId\(null\)/);
    assert.match(arena, /loadEligibleVoiceResume(?:<VoiceTranscriptRecord>)?\(/);
    assert.match(arena, /Call interrupted\. Tap to continue\./);
    assert.match(arena, /resumeContext:/);
    assert.match(arena, /loadIncompletePracticeSession\(/);
    assert.match(arena, /handleContinueAfterInterrupt/);
    assert.match(arena, /recoverMicrophone\(/);
    assert.match(arena, /!isGuestPreview && !isAssessment/);
    assert.match(arena, /!callInterrupted/);
    assert.match(realtime, /onMicTrackEnded/);
    assert.match(realtime, /watchMicrophoneEnded/);
  });

  it("lets recoverMicrophone run on a live hold or hands-free session", () => {
    const recover = realtime.slice(
      realtime.indexOf("export async function recoverMicrophone"),
      realtime.indexOf("function createSilentAudioStream")
    );
    assert.doesNotMatch(
      recover,
      /if\s*\(\s*!connection\.usedSilentMicFallback/
    );
    assert.doesNotMatch(
      recover,
      /if\s*\(\s*connection\.usedSilentMicFallback\s*\)\s*return/
    );
    assert.match(recover, /watchMicrophoneEnded\(replacementStream/);
    assert.match(realtime, /iceConnectionState === "disconnected"/);
    const continueFn = arena.slice(
      arena.indexOf("async function handleContinueAfterInterrupt"),
      arena.indexOf("function assessmentUiTerminal")
    );
    assert.doesNotMatch(continueFn, /usedSilentMicFallback/);
    assert.match(continueFn, /recoverMicrophone\(/);
    assert.match(continueFn, /resumeRemoteAudio\(/);
  });

  it("leaves guest preview on the failed error path without signed-in resume", () => {
    assert.match(
      arena,
      /if \(isGuestPreview\) \{\s*if \(state === "failed"\)/
    );
    const start = arena.slice(
      arena.indexOf("async function handleStart()"),
      arena.indexOf("useEffect(() => {\n    if (!autoStart")
    );
    assert.match(
      start,
      /!isGuestPreview && !isAssessment\s*\n\s*\? loadEligibleVoiceResume/
    );
    assert.match(start, /const resumedTurns: TranscriptTurn\[\] = resumeRecord\.turns/);
  });
});
