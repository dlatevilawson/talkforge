import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCheckInCopy } from "./copy.ts";
import {
  isStaleDraftingTimestamp,
  sanitizeDraftBody,
} from "./draft-validate.ts";

describe("Forge Agent draft validation", () => {
  it("rejects empty, oversized, and URL-bearing bodies", () => {
    assert.equal(sanitizeDraftBody(""), null);
    assert.equal(sanitizeDraftBody("   "), null);
    assert.equal(sanitizeDraftBody("See https://evil.example"), null);
    assert.equal(sanitizeDraftBody("Open /app/practice?start=1"), null);
    assert.equal(sanitizeDraftBody("x".repeat(401)), null);
    assert.equal(sanitizeDraftBody("Name the number once, then stop."), "Name the number once, then stop.");
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
});
