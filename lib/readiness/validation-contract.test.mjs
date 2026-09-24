import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const validationPath = new URL(
  "../../atos/product/READINESS-SHADOW-VALIDATION-001.md",
  import.meta.url
);
const measurementPath = new URL(
  "../../atos/product/READINESS-MEASUREMENT-001.md",
  import.meta.url
);

describe("readiness shadow validation pass bar", () => {
  it("is authoritative only as a validation pass bar", async () => {
    const source = await readFile(validationPath, "utf8");
    assert.match(source, /Status.*Founder authorized — shadow validation pass bar only/);
    assert.match(source, /Decision.*065/);
    assert.match(source, /does not authorize migration application, shadow activation/);
    assert.match(source, /Nothing becomes member-facing\s+automatically/);
  });

  it("defines a covered, independently reviewed shadow cohort", async () => {
    const source = await readFile(validationPath, "utf8");
    assert.match(source, /\*\*20\*\* eligible, consented shadow sessions/);
    assert.match(source, /at least four scenario families/);
    assert.match(source, /Two independent human reviewers per session/);
    assert.match(source, /at least 60 adjudicated non-null signal cells/);
    assert.match(source, /at least ten adjudicated non-null cells for each signal/);
    assert.match(source, /at least ten band-eligible sessions/);
  });

  it("locks the agreement and stability thresholds", async () => {
    const source = await readFile(validationPath, "utf8");
    assert.match(source, /Assessed-vs-null agreement across all signal cells \| 90%/);
    assert.match(source, /Exact evidence-strength agreement across all signal cells \| 85%/);
    assert.match(source, /Exact level agreement across assessed cells \| 80%/);
    assert.match(source, /Level agreement within one level across assessed cells \| 95%/);
    assert.match(source, /Exact overall-band agreement across band-eligible sessions \| 85%/);
    assert.match(source, /Assessed-vs-null decision stability across repeated signal cells \| 95%/);
    assert.match(source, /Exact evidence-strength stability across repeated signal cells \| 85%/);
    assert.match(source, /Exact level stability across repeated assessed cells \| 85%/);
  });

  it("makes null defaults and evidence integrity zero tolerance", async () => {
    const source = await readFile(validationPath, "utf8");
    assert.match(source, /Composure is null whenever.*no friction event/);
    assert.match(source, /Adaptability is null whenever.*no shift, objection/);
    assert.match(source, /Fabricated, untraceable, prior-session, or cross-member evidence/);
    assert.match(source, /Null converted to level 0 or used in a band or trend/);
    assert.match(source, /Any one of the following fails the cohort immediately/);
  });

  it("defines revise, halt, and insufficient-coverage paths", async () => {
    const source = await readFile(validationPath, "utf8");
    assert.match(source, /### Revise and repeat/);
    assert.match(source, /collect a fresh\s+Stage 2 cohort/);
    assert.match(source, /### Halt/);
    assert.match(source, /READINESS_SHADOW_ENABLED=false/);
    assert.match(source, /### Insufficient coverage/);
    assert.match(source, /Do not call it\s+a pass or a fail/);
  });

  it("is linked from the authoritative measurement contract as a completed gate", async () => {
    const source = await readFile(measurementPath, "utf8");
    assert.match(
      source,
      /\[READINESS-SHADOW-VALIDATION-001\]\(READINESS-SHADOW-VALIDATION-001\.md\)/
    );
    assert.match(source, /Complete.*Decision 065 authorized the thresholds and fail paths/);
  });
});
