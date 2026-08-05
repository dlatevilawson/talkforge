import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensurePersistedLivingProfile } from "@/lib/system1/ensure-living-profile";
import { buildAdaptiveHome } from "./types";

export type PracticeRouteAccess = {
  allowed: boolean;
  reason:
    | "ready"
    | "unauthenticated"
    | "profile_incomplete"
    | "readiness_unavailable";
};

/**
 * Secure route-boundary check for coaching entry.
 *
 * Proxy remains the optimistic authentication layer. This DAL check loads the
 * canonical Living Profile and runs the same System 2 model as Adaptive Home.
 * Any missing or failed dependency denies coaching entry.
 */
export async function evaluatePracticeRouteAccess(): Promise<PracticeRouteAccess> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, reason: "unauthenticated" };
    }

    const ensured = await ensurePersistedLivingProfile(supabase, user);
    if (!ensured.tableReady) {
      return { allowed: false, reason: "readiness_unavailable" };
    }

    const home = buildAdaptiveHome(ensured.profile);
    const allowed =
      home.readiness.profileGatePassed &&
      home.recommendation?.href === "/app/practice";

    return {
      allowed,
      reason: allowed ? "ready" : "profile_incomplete",
    };
  } catch (error) {
    console.warn(
      "[readiness] Practice route evaluation failed",
      error instanceof Error ? error.name : "unknown"
    );
    return { allowed: false, reason: "readiness_unavailable" };
  }
}
