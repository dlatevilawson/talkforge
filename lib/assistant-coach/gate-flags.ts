/**
 * Phase 4B.4/4B.5 — gate FLAGS.
 * Diagnosis-only Coach gates anonymous use only at the safety/economic turn cap.
 * The persisted value/status fields are legacy and no longer drive product UI.
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
  const hasExperiencedValue = false;
  const anonTurnCount = session.turnCount;
  const overCap = isAnonymous && anonTurnCount >= turnCap;
  const mustAuthenticateToContinue = overCap;

  return {
    hasExperiencedValue,
    anonTurnCount,
    turnCap,
    mustAuthenticateToContinue,
    copyKey: "placeholder",
  };
}
