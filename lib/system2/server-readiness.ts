import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapLivingProfileRow } from "@/lib/system1/persistence";
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

    const { data, error } = await supabase
      .from("living_profiles")
      .select(
        "user_id, display_name, preferred_nickname, purpose_statement, personal_principles, seasons, coaching_intensity, preferred_coaching_style, mattering_conversation_ids, provenance, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[readiness] Living Profile query failed", error.code);
      return { allowed: false, reason: "readiness_unavailable" };
    }

    const home = buildAdaptiveHome(data ? mapLivingProfileRow(data) : null);
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
