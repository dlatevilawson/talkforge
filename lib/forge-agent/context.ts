import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCoachContext,
  type CoachContext,
} from "@/lib/system1/profile-intelligence.ts";
import {
  mapLivingProfileRow,
  type LivingProfileRow,
} from "@/lib/system1/persistence.ts";
import { truncateToUtf8Bytes } from "./draft-validate.ts";

/**
 * Read-only coaching context for Forge Agent drafts.
 * Never calls ensurePersistedLivingProfile.
 * Never reads coach_memory or session_reports.
 * Never writes identity.
 */
export async function readApprovedCoachingContext(
  admin: SupabaseClient,
  userId: string
): Promise<CoachContext | null> {
  const { data, error } = await admin
    .from("living_profiles")
    .select(
      "user_id, version, display_name, preferred_nickname, purpose_statement, personal_principles, seasons, coaching_intensity, preferred_coaching_style, mattering_conversation_ids, provenance, evidence_ledger, profile_insights, presence_scores, goals, strengths, challenges, profile_source, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return buildCoachContext(mapLivingProfileRow(data as LivingProfileRow));
}

export function compactCoachContext(
  context: CoachContext | null,
  maxBytes: number
): string {
  if (!context) return "";
  const lines = [
    ...context.goals.slice(0, 3).map((item) => `Goal: ${item}`),
    ...context.activeFocusAreas.slice(0, 3).map((item) => `Focus: ${item}`),
    ...context.supportedPatterns.slice(0, 3).map((item) => `Pattern: ${item}`),
    ...context.strengths.slice(0, 2).map((item) => `Strength: ${item}`),
    ...context.trainingImplications
      .slice(0, 2)
      .map((item) => `Training: ${item}`),
  ];
  const text = lines.join("\n").trim();
  return truncateToUtf8Bytes(text, maxBytes);
}
