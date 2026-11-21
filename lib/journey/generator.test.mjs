import test from "node:test";
import assert from "node:assert/strict";
import { generateBlockDays, planEndDate } from "./generator.ts";
import { STARTER_DRILLS } from "../drills/catalog.ts";

test("plan dates use the locked 42/182-day spans", () => {
  assert.equal(planEndDate("6_week", "2026-10-26"), "2026-12-06");
  assert.equal(planEndDate("6_month", "2026-10-26"), "2027-04-25");
});

test("block generator creates fourteen consecutive, non-empty days", () => {
  const days = generateBlockDays({ startDate: "2026-10-26", focusSignal: "composure", drills: STARTER_DRILLS });
  assert.equal(days.length, 14);
  assert.deepEqual(days.map((day) => day.dayIndex), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.equal(days[0].date, "2026-10-26");
  assert.equal(days.at(-1).date, "2026-11-08");
  assert.ok(days.every((day) => day.drillId && day.fieldAssignmentText));
});

test("consecutive days do not repeat the identical drill", () => {
  const days = generateBlockDays({ startDate: "2026-10-26", focusSignal: "purpose", drills: STARTER_DRILLS });
  for (let i = 1; i < days.length; i += 1) assert.notEqual(days[i].drillId, days[i - 1].drillId);
});

test("the first week uses seven distinct drills before repeating", () => {
  const days = generateBlockDays({ startDate: "2026-10-26", focusSignal: "purpose", drills: STARTER_DRILLS });
  assert.equal(new Set(days.slice(0, 7).map((day) => day.drillId)).size, Math.min(7, new Set(STARTER_DRILLS.filter((drill) => drill.modality !== "field").map((drill) => drill.id)).size));
});

test("each skill's distinct drills are selected in phase order within the block", () => {
  const phases = ["recognise", "build", "rehearse", "roleplay"];
  const signals = ["purpose", "perspective", "composure", "message", "adaptability"];
  const drills = signals.flatMap((signal) => phases.map((phase, index) => ({
    ...STARTER_DRILLS[0],
    id: `${signal}-${phase}`,
    slug: `${signal}-${phase}`,
    name: `${signal} ${phase}`,
    signal,
    phase,
    modality: "voice",
    difficulty: 1,
    scenarioTags: [],
  })));
  const byId = new Map(drills.map((drill) => [drill.id, drill]));
  const days = generateBlockDays({ startDate: "2026-11-21", focusSignal: "purpose", drills });

  for (const signal of signals) {
    const seen = new Set();
    const firstAppearances = days
      .map((day) => byId.get(day.drillId))
      .filter((drill) => {
        if (drill.signal !== signal || seen.has(drill.id)) return false;
        seen.add(drill.id);
        return true;
      })
      .map((drill) => drill.phase);
    const phaseIndexes = firstAppearances.map((phase) => phases.indexOf(phase));
    assert.deepEqual(phaseIndexes, [...phaseIndexes].sort((a, b) => a - b), `${signal} phase order`);
  }
  assert.equal(new Set(days.slice(0, 7).map((day) => day.drillId)).size, 7);
});

test("unassigned phases remain eligible and do not block day generation", () => {
  const unassigned = STARTER_DRILLS.map((drill) => ({ ...drill, phase: null }));
  const days = generateBlockDays({ startDate: "2026-11-21", focusSignal: "purpose", drills: unassigned });
  assert.equal(days.length, 14);
  assert.ok(days.every((day) => day.drillId));
});

