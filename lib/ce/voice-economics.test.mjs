import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adviseVoiceEconomics,
  estimateTokensFromText,
  outputBudgetForTurn,
  REALTIME_AUDIO_TOKENS_PER_SECOND,
  REALTIME_TOKEN_CEILINGS,
  VOICE_SESSION_SOFT_BUDGET,
} from "./voice-economics.ts";

describe("voice economics", () => {
  it("uses audio-token ceilings (~50 tok/s) so API never truncates a 2–3 sentence turn", () => {
    assert.equal(REALTIME_AUDIO_TOKENS_PER_SECOND, 50);
    assert.equal(REALTIME_TOKEN_CEILINGS.NORMAL_TURN_MAX_TOKENS, 1000);
    assert.equal(REALTIME_TOKEN_CEILINGS.SESSION_OPENING_MAX_TOKENS, 1500);

    assert.equal(outputBudgetForTurn("normal", false), 1000);
    assert.equal(outputBudgetForTurn("opening", false), 1500);
    assert.equal(outputBudgetForTurn("closing", false), 1000);
    assert.ok(
      outputBudgetForTurn("quick_followup", false) <
        outputBudgetForTurn("normal", false)
    );
    assert.ok(
      outputBudgetForTurn("complex", false) >=
        outputBudgetForTurn("normal", false)
    );

    // Concise mode must still allow ~15s of speech (not text-scale 60–120).
    assert.ok(outputBudgetForTurn("normal", true) >= 750);
    assert.ok(outputBudgetForTurn("opening", true) >= 1000);
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
    assert.ok(soft.nextMaxOutputTokens >= 750);

    const hard = adviseVoiceEconomics({
      assistantTurns: 50,
      estimatedOutputTokens: VOICE_SESSION_SOFT_BUDGET.outputTokensHard,
      estimatedInputTokens: 8000,
      bargeInCount: 2,
      userSpeechEvents: 40,
    });
    assert.equal(hard.conciseMode, true);
    assert.equal(hard.reason, "hard_budget");
    assert.ok(hard.nextMaxOutputTokens >= 750);
  });

  it("estimates tokens from text for observability", () => {
    assert.equal(estimateTokensFromText(""), 0);
    assert.ok(estimateTokensFromText("Hello coach, I want to practice.") >= 1);
  });
});
