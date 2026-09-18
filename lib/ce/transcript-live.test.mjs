import test from "node:test";
import assert from "node:assert/strict";
import {
  extractFinalizedFounderTranscript,
  extractLiveTranscriptDelta,
} from "./transcript.ts";

test("extractLiveTranscriptDelta reads forge streaming deltas", () => {
  const partial = extractLiveTranscriptDelta({
    type: "response.output_audio_transcript.delta",
    delta: "Hello ",
  });
  assert.deepEqual(partial, {
    role: "forge",
    delta: "Hello ",
    done: false,
  });

  const done = extractLiveTranscriptDelta({
    type: "response.output_audio_transcript.done",
    transcript: "Hello there",
  });
  assert.deepEqual(done, { role: "forge", delta: "", done: true });
});

test("extractLiveTranscriptDelta reads user transcription deltas", () => {
  const partial = extractLiveTranscriptDelta({
    type: "conversation.item.input_audio_transcription.delta",
    delta: "I think",
  });
  assert.deepEqual(partial, {
    role: "founder",
    delta: "I think",
    done: false,
  });

  const done = extractLiveTranscriptDelta({
    type: "conversation.item.input_audio_transcription.completed",
    transcript: "I think aloud",
  });
  assert.deepEqual(done, { role: "founder", delta: "", done: true });
});

test("extractLiveTranscriptDelta ignores unrelated events", () => {
  assert.equal(
    extractLiveTranscriptDelta({ type: "response.created" }),
    null
  );
});

test("extractFinalizedFounderTranscript reads completed mic transcription", () => {
  assert.deepEqual(
    extractFinalizedFounderTranscript({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "member-1",
      transcript: "I want to explain the book.",
    }),
    { text: "I want to explain the book.", itemId: "member-1" }
  );
});

test("extractFinalizedFounderTranscript reads a finalized input-audio item", () => {
  assert.deepEqual(
    extractFinalizedFounderTranscript({
      type: "conversation.item.done",
      item: {
        id: "member-2",
        role: "user",
        content: [
          {
            type: "input_audio",
            transcript: "Let me finish this thought.",
          },
        ],
      },
    }),
    { text: "Let me finish this thought.", itemId: "member-2" }
  );
});
