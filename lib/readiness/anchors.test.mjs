import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const anchorPath = new URL(
  "../../atos/product/READINESS-ANCHORS-001.md",
  import.meta.url
);
const contractPath = new URL(
  "../../atos/product/READINESS-MEASUREMENT-001.md",
  import.meta.url
);

const signals = [
  "Purpose",
  "Perspective",
  "Composure",
  "Message",
  "Adaptability",
];

describe("readiness behavioral anchors", () => {
  it("contains exactly five level anchors for each readiness signal", async () => {
    const source = await readFile(anchorPath, "utf8");

    for (const [index, signal] of signals.entries()) {
      const start = source.indexOf(`## ${signal} —`);
      const end =
        index === signals.length - 1
          ? source.indexOf("## Version-change checklist", start)
          : source.indexOf(`## ${signals[index + 1]} —`, start);

      assert.notEqual(start, -1, `missing ${signal} section`);
      assert.ok(end > start, `cannot find end of ${signal} section`);

      const section = source.slice(start, end);
      const levels = section.match(/^\| \*\*[0-4] —/gm) ?? [];
      assert.equal(levels.length, 5, `${signal} must contain five anchors`);
    }
  });

  it("requires all five review fields for every anchor cell", async () => {
    const source = await readFile(anchorPath, "utf8");
    const header =
      "| Level | Required behavior | Disqualifying behavior | Minimum evidence | Positive example | Counterexample |";
    assert.equal(source.split(header).length - 1, 5);
  });

  it("is authoritative only for private shadow evaluation", async () => {
    const source = await readFile(anchorPath, "utf8");
    assert.match(source, /Authoritative — shadow evaluation only/);
    assert.match(source, /Decision.*064/);
    assert.match(source, /No readiness assessment, level,/);
    assert.match(source, /may be shown to a member yet/);
  });

  it("preserves readiness language and forbidden-claim boundaries", async () => {
    const source = await readFile(anchorPath, "utf8");
    assert.doesNotMatch(source, /0[–-]100|Battle-Tested|ready for the real moment/i);
    assert.match(source, /null, never level 0/);
    assert.match(source, /cross-member comparison/);
    assert.match(source, /prediction of real-world success/);
  });

  it("is linked as an approved shadow-only gate from the parent contract", async () => {
    const source = await readFile(contractPath, "utf8");
    assert.match(source, /\[READINESS-ANCHORS-001\]\(READINESS-ANCHORS-001\.md\)/);
    assert.match(source, /authorized the 25-cell behavioral anchors/);
    assert.match(source, /Decision 064 authorizes shadow evaluation only/);
  });
});
