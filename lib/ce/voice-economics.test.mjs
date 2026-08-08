import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adviseVoiceEconomics,
  estimateTokensFromText,
  outputBudgetForTurn,
  VOICE_SESSION_SOFT_BUDGET,
} from "./voice-economics.ts";

describe("voice economics", () => {
  it("gives turns enough headroom so API caps do not truncate mid-sentence", () => {
    assert.ok(outputBudgetForTurn("normal", false) >= 220);
    assert.ok(outputBudgetForTurn("opening", false) >= 260);
    assert.ok(
      outputBudgetForTurn("quick_followup", false) <
        outputBudgetForTurn("normal", false)
    );
    assert.ok(
      outputBudgetForTurn("complex", false) >
        outputBudgetForTurn("normal", false)
    );
  });

  it("engages concise mode near soft budget without hard-killing", () => {
    const soft = adviseVoiceEconomics({
      assistantTurns: 10,
      estimatedOutputTokens: Math.ceil(
        VOICE_SESSION_SOFT_BUDGET.outputTokensSoft *
          VOICE_SESSION_SOFT_BUDGET.conciseAtRatio
      ),
      estimatedInputTokens: 1000,
      bargeInCount: 0,
      userSpeechEvents: 10,
    });
    assert.equal(soft.conciseMode, true);
    assert.equal(soft.reason, "soft_budget");
    // Concise still leaves room to finish a short spoken thought.
    assert.ok(soft.nextMaxOutputTokens >= 100);
    assert.ok(soft.nextMaxOutputTokens <= 180);

    const hard = adviseVoiceEconomics({
      assistantTurns: 50,
      estimatedOutputTokens: VOICE_SESSION_SOFT_BUDGET.outputTokensHard,
      estimatedInputTokens: 8000,
      bargeInCount: 2,
      userSpeechEvents: 40,
    });
    assert.equal(hard.conciseMode, true);
    assert.equal(hard.reason, "hard_budget");
    assert.ok(hard.nextMaxOutputTokens > 0);
  });

  it("estimates tokens from text for observability", () => {
    assert.equal(estimateTokensFromText(""), 0);
    assert.ok(estimateTokensFromText("Hello coach, I want to practice.") >= 1);
  });
});
