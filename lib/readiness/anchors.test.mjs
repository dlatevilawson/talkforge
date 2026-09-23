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

describe("readiness behavioral anchor draft", () => {
  it("contains exactly five level anchors for each readiness signal", async () => {
    const source = await readFile(anchorPath, "utf8");

    for (const [index, signal] of signals.entries()) {
      const start = source.indexOf(`## ${signal} —`);
      const end =
        index === signals.length - 1
          ? source.indexOf("## Founder review checklist", start)
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

  it("is visibly non-authoritative and cannot be used by an evaluator", async () => {
    const source = await readFile(anchorPath, "utf8");
    assert.match(source, /Draft — Founder review; non-authoritative/);
    assert.match(source, /Do not implement from this document/);
    assert.match(source, /No evaluator, prompt, UI, migration, or production/);
    assert.match(source, /Until\s+then, the answer is no\./);
  });

  it("preserves readiness language and forbidden-claim boundaries", async () => {
    const source = await readFile(anchorPath, "utf8");
    assert.doesNotMatch(source, /0[–-]100|Battle-Tested|ready for the real moment/i);
    assert.match(source, /null, never level 0/);
    assert.match(source, /cross-member comparison/);
    assert.match(source, /prediction of real-world success/);
  });

  it("is linked as a gated draft from the authoritative parent contract", async () => {
    const source = await readFile(contractPath, "utf8");
    assert.match(source, /\[READINESS-ANCHORS-001\]\(READINESS-ANCHORS-001\.md\)/);
    assert.match(source, /non-authoritative and must not be consumed by an evaluator/);
  });
});
