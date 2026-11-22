import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBlockCompletion, nextBlockStartDate, resolveCompletedBlockRetry, safeJourneyAction } from "./check-in.ts";

test("a completed block is distinct from an empty or pending block", () => {
  assert.deepEqual(evaluateBlockCompletion(["done", "done"]), {
    completedDays: 2,
    totalDays: 2,
    blockComplete: true,
  });
  assert.equal(evaluateBlockCompletion(["done", "pending"]).blockComplete, false);
  assert.equal(evaluateBlockCompletion([]).blockComplete, false);
});

test("the next block starts the day after the completed block", () => {
  assert.equal(nextBlockStartDate("2026-11-08"), "2026-11-09");
});

test("a retry of a completed block reuses its existing next block without creating another", () => {
  const programs = [{ blockNumber: 1, status: "completed" }, { blockNumber: 2, status: "active" }];
  let createdPrograms = 0;
  const result = resolveCompletedBlockRetry(
    programs[0].status,
    programs.find((program) => program.blockNumber === programs[0].blockNumber + 1) ?? null,
  );
  if (result.kind === "continue") createdPrograms += 1;
  assert.equal(result.kind, "reuse");
  assert.equal(result.nextBlock.blockNumber, 2);
  assert.equal(createdPrograms, 0);
});

test("safe journey action results never expose raw database errors", async () => {
  const result = await safeJourneyAction(
    async () => { throw new Error("Cannot coerce the result to a single JSON object"); },
    "Could not start the next block. Please try again.",
  );
  assert.deepEqual(result, { ok: false, message: "Could not start the next block. Please try again." });
  assert.doesNotMatch(result.message, /PostgREST|Supabase|Cannot coerce/);
});
