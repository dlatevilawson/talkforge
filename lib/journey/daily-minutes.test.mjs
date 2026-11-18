import assert from "node:assert/strict";
import { test } from "node:test";
import { initialTrainingPlanRow, normalizeDailyMinutes, parseOptionalDailyMinutes } from "./daily-minutes.ts";

test("daily-minute validation accepts 5, 10, 15 and defaults invalid values to 5", () => {
  for (const value of [5, 10, 15]) assert.equal(normalizeDailyMinutes(value), value);
  assert.equal(normalizeDailyMinutes(7), 5);
  assert.equal(normalizeDailyMinutes("invalid"), 5);
  assert.equal(parseOptionalDailyMinutes(""), null);
});

test("initial plan insert includes an explicit setting or preserves skipped null", () => {
  const base = { memberId: "member", kind: "6_week", startsOn: "2026-11-17", endsOn: "2026-12-28" };
  assert.equal(initialTrainingPlanRow({ ...base, dailyMinutes: 10 }).daily_minutes, 10);
  assert.equal(initialTrainingPlanRow(base).daily_minutes, null);
});
