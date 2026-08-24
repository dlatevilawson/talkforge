import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { shouldShowOverall } from "./progress-display.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Progress overall display", () => {
  it("hides Overall after a single session even if a number is calculable", () => {
    assert.equal(shouldShowOverall(0), false);
    assert.equal(shouldShowOverall(1), false);
  });

  it("shows Overall only after enough sessions for it to be meaningful", () => {
    assert.equal(shouldShowOverall(2), true);
    assert.equal(shouldShowOverall(5), true);
  });
});

describe("Progress copy (IV-UX-010)", () => {
  it("uses approved Progress language and drops Signal theater", () => {
    const page = readFileSync(join(root, "app/app/progress/page.tsx"), "utf8");
    assert.match(page, /What you.ve practiced/);
    assert.match(page, /How you showed up/);
    assert.match(page, /The conversations you.ve practiced/);
    assert.match(page, /What happened here helps shape/);
    assert.match(page, /From your sessions — not a quiz/);
    assert.doesNotMatch(page, /Voice of your growth/i);
    assert.doesNotMatch(page, /practice signal/i);
    assert.match(page, /shouldShowOverall/);
    assert.doesNotMatch(page, />\s*Signal\s*</);
  });
});

describe("Living Profile presentation (IV-UX-010)", () => {
  it("changes labels only — diagnosis fields still render", () => {
    const page = readFileSync(join(root, "app/app/profile/page.tsx"), "utf8");
    assert.match(page, /What we heard/);
    assert.match(page, /This is the conversation\. Not a plan/);
    assert.doesNotMatch(page, /Member Presence Profile/);
    assert.doesNotMatch(page, /Pressure Duration/);
    assert.doesNotMatch(page, /From your assessment/);
    assert.match(page, /living\.goals/);
    assert.match(page, /living\.challenges/);
    assert.match(page, /living\.presenceScores/);
    assert.match(page, /\/api\/living-profile/);
  });
});
