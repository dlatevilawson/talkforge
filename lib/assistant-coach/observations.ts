/**
 * Phase 4B.4 — validate model observations before System 1 apply.
 * OWN-001: never accept purpose/identity authority writes from the model.
 */
import {
  isFactCategory,
  looksLikeInteractionSignal,
  type ProfileEvidenceCategory,
  type ProfileEvidenceConfidence,
} from "../system1/profile-evidence.ts";

export type RawModelObservation = {
  text?: unknown;
  category?: unknown;
  confidence?: unknown;
};

export type ValidatedObservation = {
  text: string;
  category: ProfileEvidenceCategory;
  confidence: ProfileEvidenceConfidence;
  accepted: true;
};

export type RejectedObservation = {
  text: string;
  category: string;
  reason: string;
  accepted: false;
};

export type ObservationDecision = ValidatedObservation | RejectedObservation;

const CATEGORIES: ReadonlySet<string> = new Set([
  "communication_goal",
  "communication_context",
  "observed_pattern",
  "communication_friction",
  "communication_strength",
  "preference",
  "practice_capacity",
  "desired_outcome",
  "lived_example",
  "interaction_signal",
]);

const CONFIDENCES: ReadonlySet<string> = new Set([
  "high",
  "medium",
  "low",
  "uncertain",
]);

const FORBIDDEN_FIELD_HINTS = [
  "purpose",
  "purposeStatement",
  "personalPrinciples",
  "principles",
  "identity",
  "seasons",
];

export function validateModelObservations(
  raw: unknown
): ObservationDecision[] {
  if (!Array.isArray(raw)) return [];
  const out: ObservationDecision[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      out.push({
        text: "",
        category: "unknown",
        reason: "observation_not_object",
        accepted: false,
      });
      continue;
    }
    const obs = item as RawModelObservation;
    const text = typeof obs.text === "string" ? obs.text.trim() : "";
    const category =
      typeof obs.category === "string" ? obs.category.trim() : "";
    const confidenceRaw =
      typeof obs.confidence === "string" ? obs.confidence.trim() : "medium";

    if (!text || text.length < 3) {
      out.push({
        text,
        category: category || "unknown",
        reason: "text_too_short",
        accepted: false,
      });
      continue;
    }
    if (FORBIDDEN_FIELD_HINTS.some((h) => category.toLowerCase().includes(h))) {
      out.push({
        text,
        category,
        reason: "forbidden_identity_category",
        accepted: false,
      });
      continue;
    }
    if (
      FORBIDDEN_FIELD_HINTS.some((h) =>
        text.toLowerCase().includes(`purpose statement`)
      )
    ) {
      // Soft: purpose-shaped claims as evidence text still OK as friction/goal,
      // but never as a purpose* category (handled above).
    }
    if (!CATEGORIES.has(category)) {
      out.push({
        text,
        category: category || "unknown",
        reason: "unknown_category",
        accepted: false,
      });
      continue;
    }
    if (!CONFIDENCES.has(confidenceRaw)) {
      out.push({
        text,
        category,
        reason: "invalid_confidence",
        accepted: false,
      });
      continue;
    }

    let finalCategory = category as ProfileEvidenceCategory;
    if (
      looksLikeInteractionSignal(text) &&
      isFactCategory(finalCategory)
    ) {
      finalCategory = "interaction_signal";
    }

    out.push({
      text,
      category: finalCategory,
      confidence: confidenceRaw as ProfileEvidenceConfidence,
      accepted: true,
    });
  }
  return out;
}
