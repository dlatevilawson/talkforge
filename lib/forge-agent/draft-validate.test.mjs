import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCheckInCopy } from "./copy.ts";
import {
  attemptMatchesAction,
  buildDraftUserPrompt,
  isOneNextMoveSentence,
  isStaleDraftingTimestamp,
  measureInputTokenUpperBound,
  sanitizeAttemptDetail,
  sanitizeDraftBody,
  utf8ByteLength,
} from "./draft-validate.ts";
import { FORGE_AGENT_DRAFT_SYSTEM, FORGE_AGENT_MAX_INPUT_TOKENS } from "./types.ts";

describe("Forge Agent draft validation", () => {
  it("rejects empty, oversized, and URL-bearing bodies", () => {
    assert.equal(sanitizeDraftBody(""), null);
    assert.equal(sanitizeDraftBody("   "), null);
    assert.equal(sanitizeDraftBody("See https://evil.example"), null);
    assert.equal(sanitizeDraftBody("Open /app/practice?start=1"), null);
    assert.equal(sanitizeDraftBody("x".repeat(401)), null);
    assert.equal(sanitizeDraftBody("Name the number once, then stop."), "Name the number once, then stop.");
  });

  it("enforces one short next-move sentence", () => {
    assert.equal(isOneNextMoveSentence("Name the number once, then stop."), true);
    assert.equal(
      sanitizeDraftBody("Name the number once. Then stop talking."),
      null
    );
    assert.equal(sanitizeDraftBody("First, name it. Second, stop."), null);
    assert.equal(sanitizeDraftBody("- Name the number\n- Then stop"), null);
    assert.equal(sanitizeDraftBody("1. Name the number once"), null);
    assert.equal(sanitizeDraftBody("* Name the number once"), null);
    assert.equal(
      sanitizeDraftBody(buildCheckInCopy({
        kind: "homework",
        title: "Prep the 1:1",
      }).body),
      buildCheckInCopy({
        kind: "homework",
        title: "Prep the 1:1",
      }).body
    );
  });

  it("keeps whySent and practiceHref deterministic", () => {
    const copy = buildCheckInCopy({
      kind: "upcoming_conversation",
      title: "Raise conversation",
    });
    assert.match(copy.whySent, /you declared/);
    assert.equal(
      copy.practiceHref,
      "/app/practice?start=1&title=Raise%20conversation"
    );
  });

  it("renames the cue time label to Remind me from", () => {
    const form = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/components/forge-agent/CueForm.tsx"),
      "utf8"
    );
    assert.match(form, /Remind me from/);
    assert.doesNotMatch(form, />\s*Due\s*</);
  });

  it("treats drafting older than 90 seconds as stale and is idempotent", () => {
    const now = new Date("2026-09-12T18:00:00.000Z");
    assert.equal(
      isStaleDraftingTimestamp("2026-09-12T17:58:29.000Z", now, 90_000),
      true
    );
    assert.equal(
      isStaleDraftingTimestamp("2026-09-12T17:58:31.000Z", now, 90_000),
      false
    );
    assert.equal(
      isStaleDraftingTimestamp("2026-09-12T17:58:29.000Z", now, 90_000),
      true
    );
  });

  it("bounds the complete request with a UTF-8 byte ceiling that catches non-ASCII undercounts", () => {
    const cjk = "漢".repeat(700);
    assert.equal(cjk.length, 700);
    assert.equal(utf8ByteLength(cjk), 2100);
    assert.ok(cjk.length / 4 < FORGE_AGENT_MAX_INPUT_TOKENS);
    assert.ok(measureInputTokenUpperBound(cjk) > FORGE_AGENT_MAX_INPUT_TOKENS);

    const dropped = buildDraftUserPrompt({
      kind: "homework",
      title: "Prep the 1:1",
      contextText: "漢".repeat(800),
    });
    assert.doesNotMatch(dropped, /Approved context/);
    assert.ok(
      measureInputTokenUpperBound(FORGE_AGENT_DRAFT_SYSTEM, dropped) <=
        FORGE_AGENT_MAX_INPUT_TOKENS
    );

    const oversized = buildDraftUserPrompt({
      kind: "homework",
      title: "漢".repeat(800),
    });
    assert.ok(
      measureInputTokenUpperBound(FORGE_AGENT_DRAFT_SYSTEM, oversized) >
        FORGE_AGENT_MAX_INPUT_TOKENS
    );
  });

  it("matches attempts by stored action or cue id after midnight", () => {
    const yesterday = {
      action_id: "action-1",
      cue_id: "cue-1",
      cron_run_id: "tick-old",
    };
    assert.equal(attemptMatchesAction(yesterday, "action-1", "other"), true);
    assert.equal(attemptMatchesAction(yesterday, "other", "cue-1"), true);
    assert.equal(attemptMatchesAction(yesterday, "other", "other"), false);
    assert.deepEqual(
      sanitizeAttemptDetail({
        ...yesterday,
        title: "secret",
        body: "secret",
        prompt: "secret",
        errorCode: "STALE_DRAFT",
      }),
      {
        action_id: "action-1",
        cue_id: "cue-1",
        cron_run_id: "tick-old",
        errorCode: "STALE_DRAFT",
      }
    );
  });
});
