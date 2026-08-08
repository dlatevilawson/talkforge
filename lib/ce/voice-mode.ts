/**
 * Arena voice interaction mode.
 *
 * Hands-free Pro turn-taking is gated off until speakerphone yield is
 * Founder-certified on device. Everyone practices with hold-to-talk for now.
 */

export type ArenaVoiceMode = "hold" | "handsfree";

/**
 * Flip only after iPhone speakerphone certification.
 * Do not re-enable from client UI or entitlement alone.
 */
export const PRO_HANDSFREE_ENABLED = false;

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
