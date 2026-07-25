/**
 * Target-plane feature flags (ATLAS-P3 / ATLAS-D-FLAGS).
 *
 * TARGET: authorized ON by default (active internal implementation).
 * FOUNDER_VISIBLE: remains OFF until a further Founder Decision after observation.
 */

function envFlag(raw: string | undefined): "on" | "off" | "unset" {
  if (raw === undefined || raw.trim() === "") return "unset";
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on") return "on";
  if (v === "0" || v === "false" || v === "off") return "off";
  return "unset";
}

/**
 * ATLAS_RUNTIME_TARGET — authorized active internal implementation (ATLAS-D-FLAGS).
 * Default: ON. Set to off/0/false only for emergency rollback.
 */
export function isTargetPlaneEnabled(): boolean {
  const state = envFlag(process.env.ATLAS_RUNTIME_TARGET);
  if (state === "off") return false;
  return true; // authorized default on (including unset)
}

/**
 * ATLAS_RUNTIME_FOUNDER_VISIBLE — Founder delivery from target plane.
 * Default: OFF. Requires explicit on + TARGET enabled.
 */
export function isTargetFounderVisibleEnabled(): boolean {
  const state = envFlag(process.env.ATLAS_RUNTIME_FOUNDER_VISIBLE);
  return isTargetPlaneEnabled() && state === "on";
}

export function getRuntimeFlagSnapshot() {
  return {
    target: isTargetPlaneEnabled(),
    founderVisible: isTargetFounderVisibleEnabled(),
    targetEnv: process.env.ATLAS_RUNTIME_TARGET ?? "(unset → default on)",
    founderVisibleEnv:
      process.env.ATLAS_RUNTIME_FOUNDER_VISIBLE ?? "(unset → default off)",
    observationWindow:
      isTargetPlaneEnabled() && !isTargetFounderVisibleEnabled(),
  };
}
