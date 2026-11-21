import test from "node:test";
import assert from "node:assert/strict";
import { STARTER_DRILLS, drillPhaseLabel, findStarterDrill, starterDrillHref } from "./catalog.ts";

test("starter library always provides a concrete non-blank entry", () => {
  assert.equal(STARTER_DRILLS.length, 3);
  for (const drill of STARTER_DRILLS) {
    assert.ok(drill.name);
    assert.ok(drill.instructions);
    assert.ok(drill.question, `${drill.name} needs a concrete question`);
    assert.ok(drill.workedExample, `${drill.name} needs a worked example`);
    assert.match(starterDrillHref(drill), /^\/app\/practice\?drill=/);
  }
  const textDrills = STARTER_DRILLS.filter((drill) => drill.modality === "text");
  assert.equal(textDrills.length, 2);
  for (const drill of textDrills) {
    assert.ok(drill.question);
    assert.ok(drill.workedExample);
  }
});

test("starter drill lookup is allowlisted", () => {
  assert.equal(findStarterDrill("unknown"), null);
  assert.equal(findStarterDrill("three-second-rule")?.signal, "composure");
  assert.equal(
    findStarterDrill("three-second-rule")?.question,
    "What opening line will you say before holding a full three-second pause?",
  );
  assert.equal(
    findStarterDrill("three-second-rule")?.workedExample,
    "Opening line: “Thanks for making time to talk.” [Hold a full three seconds of silence.] Continue: “I want to make sure we leave with one clear next step.”",
  );
});

test("starter drill phases have quiet display labels", () => {
  assert.equal(STARTER_DRILLS.find((drill) => drill.slug === "one-sentence-point")?.phase, "build");
  assert.equal(STARTER_DRILLS.find((drill) => drill.slug === "three-second-rule")?.phase, "rehearse");
  assert.equal(STARTER_DRILLS.find((drill) => drill.slug === "prep-builder")?.phase, "build");
  assert.equal(drillPhaseLabel("recognise"), "Recognise");
  assert.equal(drillPhaseLabel("roleplay"), "Role-play");
  assert.equal(drillPhaseLabel(null), null);
});

