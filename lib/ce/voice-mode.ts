/**
 * Arena voice interaction mode.
 *
 * Pro members talk with Coach Forge hands-free. Free members keep the
 * deliberate hold-to-talk interaction.
 */

export type ArenaVoiceMode = "hold" | "handsfree";

/**
 * Founder-directed Pro activation. Keep this server-shared gate explicit so
 * hands-free can be disabled in one place if device evidence finds a regression.
 */
export const PRO_HANDSFREE_ENABLED = true;

/** Server + client single source of truth for Live Arena mic UX. */
export function resolveArenaVoiceMode(input: {
  planIsPro: boolean;
}): ArenaVoiceMode {
  if (!PRO_HANDSFREE_ENABLED) return "hold";
  return input.planIsPro ? "handsfree" : "hold";
}

export function isHandsFreeMode(mode: ArenaVoiceMode): boolean {
  return mode === "handsfree";
}

type VoiceUsageEntitlement = {
  plan: "free" | "pro";
  reason: string;
};

export type VoiceUsageStartCapability =
  | {
      allowed: true;
      plan: "free" | "pro";
      voiceMode: ArenaVoiceMode;
    }
  | { allowed: false };

/**
 * Resolve usage metadata from server entitlement, never a client plan claim.
 * The Realtime mint remains authoritative for the actual session mode.
 */
export function resolveVoiceUsageStartCapability(input: {
  requestedVoiceMode: ArenaVoiceMode;
  entitlement: VoiceUsageEntitlement;
}): VoiceUsageStartCapability {
  const planIsPro =
    input.entitlement.plan === "pro" ||
    input.entitlement.reason === "pro" ||
    input.entitlement.reason === "staff";
  const plan = planIsPro ? "pro" : "free";
  const permittedMode = resolveArenaVoiceMode({ planIsPro });

  if (
    input.requestedVoiceMode === "handsfree" &&
    permittedMode !== "handsfree"
  ) {
    return { allowed: false };
  }

  return {
    allowed: true,
    plan,
    voiceMode: input.requestedVoiceMode,
  };
}
