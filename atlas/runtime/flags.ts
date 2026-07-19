/**
 * Target-plane feature flags (ATLAS-P3 W3+).
 * Founder-visible target path remains OFF until Founder enables the flag.
 */

export function isTargetPlaneEnabled(): boolean {
  const raw = process.env.ATLAS_RUNTIME_TARGET?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function isTargetFounderVisibleEnabled(): boolean {
  // Separate gate: even if target modules run (shadow), Founder-visible
  // delivery via target plane requires explicit enablement.
  const raw = process.env.ATLAS_RUNTIME_FOUNDER_VISIBLE?.trim().toLowerCase();
  return isTargetPlaneEnabled() && (raw === "1" || raw === "true" || raw === "on");
}
