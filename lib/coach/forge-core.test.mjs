/**
 * Forge Core contract — always-on boundary layer for every mode.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FORGE_CORE_CONTRACT,
  FORGE_CORE_VERSION,
  buildForgeSystemPrompt,
} from "./forge-core.ts";
import { buildAssessmentSystemInstructions } from "../ce/assessment-prompt.ts";

test("Forge Core encodes identity, ownership, evidence, scope, hard boundaries, escalation", () => {
  assert.equal(FORGE_CORE_VERSION, "1.0.0");
  assert.match(FORGE_CORE_CONTRACT, /FORGE CORE \(always-on/);
  assert.match(FORGE_CORE_CONTRACT, /communication coach/i);
  assert.match(FORGE_CORE_CONTRACT, /Never invent the user's identity/i);
  assert.match(FORGE_CORE_CONTRACT, /never decide what should matter/i);
  assert.match(FORGE_CORE_CONTRACT, /without evidence/i);
  assert.match(FORGE_CORE_CONTRACT, /clinical or medical/i);
  assert.match(FORGE_CORE_CONTRACT, /Never speak or think for the user/i);
  assert.match(FORGE_CORE_CONTRACT, /Never treat the user as broken/i);
  assert.match(FORGE_CORE_CONTRACT, /Preserve user ownership and autonomy/i);
  assert.match(FORGE_CORE_CONTRACT, /ESCALATION \/ HANDOFF/i);
  assert.match(FORGE_CORE_CONTRACT, /mental-health or medical care/i);
  assert.match(
    FORGE_CORE_CONTRACT,
    /Forge Core → current objective(?: \(mode\))? → conversation evidence/i
  );
  assert.match(
    FORGE_CORE_CONTRACT,
    /Modes must not redefine your personality/i
  );
});

test("buildForgeSystemPrompt places Core before mode objective", () => {
  const out = buildForgeSystemPrompt({
    modeObjective: [
      "CURRENT MODE: PRACTICE",
      "This mode does not redefine Forge Core. Goals and capabilities only.",
      "GOAL: Create room for the member to practice real communication.",
    ].join("\n"),
    memoryBlock: "Member relationship memory: (test)",
  });
  const coreIdx = out.indexOf("FORGE CORE");
  const modeIdx = out.indexOf("CURRENT MODE: PRACTICE");
  assert.ok(coreIdx >= 0);
  assert.ok(modeIdx > coreIdx);
  assert.match(out, /Member relationship memory/);
  assert.match(out, /Never invent the user's identity/i);
});

test("Assessment inherits Core and does not restate clinical hard fence", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /FORGE CORE \(always-on/);
  assert.match(system, /CURRENT MODE: DIAGNOSTIC ASSESSMENT/);
  assert.match(system, /This mode does not redefine Forge Core/i);
  assert.match(system, /Never invent the user's identity/i);
  assert.match(system, /clinical or medical/i);
  assert.match(
    system,
    /Clinical \/ medical \/ identity \/ dignity \/ speak-for-user boundaries are in Forge Core/i
  );
  assert.doesNotMatch(system, /NOT therapy\. NOT clinical diagnosis/);
  assert.doesNotMatch(
    system,
    /NEVER diagnose medical or psychological conditions/
  );
  // Core appears once as the fence — mode objective must not open with a second identity block.
  assert.equal(
    (system.match(/You are Forge, the communication coach inside TalkForge/g) ||
      []).length,
    1
  );
});
