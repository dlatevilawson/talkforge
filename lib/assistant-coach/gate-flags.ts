/**
 * Phase 4B.4/4B.5 — gate FLAGS.
 * Sticky value + turn cap owned by 4B.5. Hard stop enforcement owned by 4B.6.
 */
import type { AssistantCoachSession } from "./session-repository.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";

export type AssistantCoachGateFlags = {
  hasExperiencedValue: boolean;
  anonTurnCount: number;
  turnCap: number;
  mustAuthenticateToContinue: boolean;
  copyKey: "placeholder";
};

export function buildGateFlags(
  session: AssistantCoachSession,
  options?: { turnCap?: number; isAnonymous?: boolean }
): AssistantCoachGateFlags {
  const turnCap = options?.turnCap ?? getAssistantCoachAnonTurnCap();
  const isAnonymous = options?.isAnonymous ?? session.userId == null;
  const hasExperiencedValue = Boolean(session.hasExperiencedValue);
  const anonTurnCount = session.turnCount;
  const overCap = isAnonymous && anonTurnCount >= turnCap;
  const mustAuthenticateToContinue =
    session.status === "gated" ||
    (isAnonymous && (hasExperiencedValue || overCap));

  return {
    hasExperiencedValue,
    anonTurnCount,
    turnCap,
    mustAuthenticateToContinue,
    copyKey: "placeholder",
  };
}
