import test from "node:test";
import assert from "node:assert/strict";
import { STARTER_DRILLS, findStarterDrill, starterDrillHref } from "./catalog.ts";

test("starter library always provides a concrete non-blank entry", () => {
  assert.equal(STARTER_DRILLS.length, 3);
  for (const drill of STARTER_DRILLS) {
    assert.ok(drill.name);
    assert.ok(drill.instructions);
    assert.match(starterDrillHref(drill), /^\/app\/practice\?drill=/);
  }
});

test("starter drill lookup is allowlisted", () => {
  assert.equal(findStarterDrill("unknown"), null);
  assert.equal(findStarterDrill("three-second-rule")?.signal, "composure");
});

