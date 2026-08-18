/**
 * Phase 4B.4 — gate FLAGS only (no semantic policy, no hard enforcement).
 * Sticky value + turn cap: 4B.5. Hard stop: 4B.6.
 */
import type { AssistantCoachSession } from "./session-repository.ts";

export type AssistantCoachGateFlags = {
  hasExperiencedValue: boolean;
  anonTurnCount: number;
  turnCap: number | null;
  mustAuthenticateToContinue: boolean;
  copyKey: "placeholder";
};

export function buildGateFlags(
  session: AssistantCoachSession
): AssistantCoachGateFlags {
  return {
    hasExperiencedValue: Boolean(session.hasExperiencedValue),
    anonTurnCount: session.turnCount,
    // 4B.5 owns the configurable cap; 4B.4 reports null.
    turnCap: null,
    // 4B.6 owns hard enforcement; flags only reflect stored gated status.
    mustAuthenticateToContinue: session.status === "gated",
    copyKey: "placeholder",
  };
}
