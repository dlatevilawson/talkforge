import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PRO_HANDSFREE_ENABLED,
  resolveArenaVoiceMode,
  resolveVoiceUsageStartCapability,
} from "./voice-mode.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("arena voice mode gate", () => {
  it("gives server-confirmed Pro hands-free and keeps Free on hold", () => {
    assert.equal(PRO_HANDSFREE_ENABLED, true);
    assert.equal(resolveArenaVoiceMode({ planIsPro: true }), "handsfree");
    assert.equal(resolveArenaVoiceMode({ planIsPro: false }), "hold");
  });

  it("accepts hands-free usage only with Pro or staff entitlement", () => {
    assert.deepEqual(
      resolveVoiceUsageStartCapability({
        requestedVoiceMode: "handsfree",
        entitlement: { plan: "pro", reason: "pro" },
      }),
      { allowed: true, plan: "pro", voiceMode: "handsfree" }
    );
    assert.deepEqual(
      resolveVoiceUsageStartCapability({
        requestedVoiceMode: "handsfree",
        entitlement: { plan: "free", reason: "staff" },
      }),
      { allowed: true, plan: "pro", voiceMode: "handsfree" }
    );
  });

  it("rejects a Free hands-free claim but preserves Free hold-to-talk", () => {
    assert.deepEqual(
      resolveVoiceUsageStartCapability({
        requestedVoiceMode: "handsfree",
        entitlement: { plan: "free", reason: "free_remaining" },
      }),
      { allowed: false }
    );
    assert.deepEqual(
      resolveVoiceUsageStartCapability({
        requestedVoiceMode: "hold",
        entitlement: { plan: "free", reason: "free_remaining" },
      }),
      { allowed: true, plan: "free", voiceMode: "hold" }
    );
  });

  it("derives voice usage plan from server entitlement, not request JSON", () => {
    const route = readFileSync(
      join(root, "app/api/voice/usage/route.ts"),
      "utf8"
    );
    assert.match(route, /evaluatePracticeEntitlement\(gate\.userId\)/);
    assert.match(route, /resolveVoiceUsageStartCapability/);
    assert.doesNotMatch(route, /body\.plan/);
    assert.doesNotMatch(route, /plan\?: "free" \| "pro"/);
  });
});
