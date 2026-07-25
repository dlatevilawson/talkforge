/**
 * CE-M2 unit checks — ordered transcript apply + coach handoff shape.
 * Run: npx --yes tsx scripts/ce-m2-transcript-check.ts
 */

import assert from "node:assert/strict";
import {
  applyRealtimeTranscriptEvent,
  summarizeTranscript,
  toCoachHistory,
  type TranscriptTurn,
} from "../lib/ce/transcript";

let turns: TranscriptTurn[] = [];

let r = applyRealtimeTranscriptEvent(turns, {
  type: "response.output_audio_transcript.done",
  transcript: "Welcome. Tell me about a system you've designed.",
  response_id: "resp_1",
});
turns = r.turns;
assert.equal(turns.length, 1);
assert.equal(turns[0].role, "forge");
assert.equal(turns[0].turnIndex, 0);

r = applyRealtimeTranscriptEvent(turns, {
  type: "conversation.item.input_audio_transcription.completed",
  transcript: "I designed a URL shortener with Redis for hot keys.",
  item_id: "item_user_1",
});
turns = r.turns;
assert.equal(turns.length, 2);
assert.equal(turns[1].role, "founder");
assert.equal(turns[1].turnIndex, 1);

// Dedup same item
r = applyRealtimeTranscriptEvent(turns, {
  type: "conversation.item.input_audio_transcription.completed",
  transcript: "duplicate",
  item_id: "item_user_1",
});
assert.equal(r.added, null);
assert.equal(r.turns.length, 2);

r = applyRealtimeTranscriptEvent(turns, {
  type: "response.audio_transcript.done",
  transcript: "What tradeoffs did you consider?",
  response_id: "resp_2",
});
turns = r.turns;

const summary = summarizeTranscript(turns);
assert.equal(summary.founderTurns, 1);
assert.equal(summary.forgeTurns, 2);
assert.equal(summary.ordered, true);

const history = toCoachHistory(turns);
assert.deepEqual(
  history.map((h) => h.role),
  ["npc", "user", "npc"]
);
assert.ok(history[1].text.includes("URL shortener"));

console.log(
  JSON.stringify(
    {
      milestone: "CE-M2",
      ok: true,
      summary,
      coachHistoryReady: true,
      turns: turns.map((t) => ({
        turnIndex: t.turnIndex,
        role: t.role,
        text: t.text,
      })),
    },
    null,
    2
  )
);
