import {
  mapAssessmentSnapshotToLivingProfile,
  parseAssessmentSnapshot,
} from "./assessment-lifecycle.ts";
import { countConfusionAnswers } from "../system1/assessment.ts";
import { mapLivingProfileRow } from "../system1/persistence.ts";
import type { ProvenanceRecord } from "../system1/types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

type TurnIn = { role?: string; text?: string };
export type AssessmentCompletionDependencies = {
  requireUser: () => Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }>;
  createMemberClient: () => Promise<SupabaseClient>;
  createAdminClient: () => SupabaseClient;
};

function newProvId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `prov_assess_${crypto.randomUUID()}`
    : `prov_assess_${Date.now()}`;
}

/** Shared production handler; dependency seam lets tests exercise the real route logic. */
export async function handleAssessmentCompletion(req: Request, deps: AssessmentCompletionDependencies): Promise<Response> {
  const gate = await deps.requireUser();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
  try {
    const body = await req.json() as { turns?: TurnIn[]; practiceSessionId?: string; assessmentSnapshot?: unknown };
    const turns = Array.isArray(body.turns) ? body.turns : [];
    const userTexts = turns.filter((turn) => (turn.role === "founder" || turn.role === "user") && typeof turn.text === "string" && turn.text.trim()).map((turn) => turn.text!.trim());
    const snapshot = parseAssessmentSnapshot(body.assessmentSnapshot);
    const supabase = await deps.createMemberClient();
    const { data: currentRow, error: loadError } = await supabase.from("living_profiles").select("*").eq("user_id", gate.userId).maybeSingle();
    if (loadError) return Response.json({ error: loadError.message || "Could not load Living Profile." }, { status: 500 });
    if (!currentRow) return Response.json({ error: "Living Profile row missing. Refresh Home and try again." }, { status: 409 });

    const current = mapLivingProfileRow(currentRow);
    const mapped = mapAssessmentSnapshotToLivingProfile(snapshot, { purposeStatement: current.purposeStatement });
    const now = new Date().toISOString();
    const evidenceRef = typeof body.practiceSessionId === "string" && body.practiceSessionId ? body.practiceSessionId : "assessment_session";
    const provenance: ProvenanceRecord[] = current.provenance.filter((item) => item.fieldPath !== "assessment_resume_snapshot");
    if (mapped.ready) {
      provenance.unshift({ id: newProvId(), fieldPath: "assessment_snapshot", claim: mapped.provenanceClaim, sourceKind: "session_observation", evidenceRefs: [evidenceRef], confidence: "medium", createdAt: now, updatedAt: now, memberConfirmed: false });
    } else if (snapshot) {
      provenance.unshift({ id: newProvId(), fieldPath: "assessment_resume_snapshot", claim: JSON.stringify({ ...snapshot, sufficient: false }), sourceKind: "session_observation", evidenceRefs: [evidenceRef], confidence: "high", createdAt: now, updatedAt: now, memberConfirmed: false });
    }
    const memberBottleneck = snapshot?.answers.what_goes_wrong?.trim() && snapshot.answerSources?.what_goes_wrong !== "synthesized"
      ? snapshot.answers.what_goes_wrong.trim()
      : null;
    const challengeList = mapped.ready
      ? [...new Set([...(memberBottleneck ? [memberBottleneck] : []), ...(mapped.challenges ?? [])])].slice(0, 8)
      : [];
    const payload = mapped.ready
      ? { goals: mapped.goals ?? [], challenges: challengeList, profile_source: "assessment" as const, provenance, version: current.version + 1, updated_at: now, ...(mapped.purposeStatement != null ? { purpose_statement: mapped.purposeStatement } : {}) }
      : { profile_source: "incomplete" as const, presence_scores: null, version: current.version + 1, updated_at: now, provenance };
    const { data: saved, error: saveError } = await supabase.from("living_profiles").update(payload).eq("user_id", gate.userId).eq("version", current.version).select("*").maybeSingle();
    if (saveError) {
      console.error("[assessment] save failed", saveError);
      return Response.json({ error: saveError.message || "Could not save assessment snapshot." }, { status: 500 });
    }
    if (!saved) return Response.json({ error: "Living Profile changed while saving the assessment. Reload and try again.", conflict: true }, { status: 409 });

    const practiceAnswer = snapshot?.answers.practice_time;
    const minutesMatch = practiceAnswer?.match(/\b(5|10|15)\s*(?:minutes?|mins?)\b/i);
    if (minutesMatch && snapshot?.answerSources?.practice_time !== "synthesized") {
      const admin = deps.createAdminClient();
      const { data: activePlan } = await admin.from("training_plans").select("id, daily_minutes").eq("member_id", gate.userId).eq("status", "active").maybeSingle();
      if (activePlan && activePlan.daily_minutes == null) {
        const { error: minutesError } = await admin.from("training_plans").update({ daily_minutes: Number(minutesMatch[1]) }).eq("id", activePlan.id).eq("member_id", gate.userId);
        if (minutesError) console.error("[assessment] daily minutes write-back failed", minutesError);
      }
    }
    const profile = mapLivingProfileRow(saved);
    return Response.json({ ready: mapped.ready, profileSource: profile.profileSource, abortedForDisengagement: false, confusionAnswerCount: countConfusionAnswers(userTexts), extraction: { goals: profile.goals, strengths: profile.strengths, challenges: profile.challenges, presenceScores: profile.presenceScores, corePattern: mapped.ready ? mapped.challenges?.[0] ?? null : null }, profile });
  } catch (err) {
    console.error("[assessment] complete failed", err);
    return Response.json({ error: "Assessment wrap failed." }, { status: 500 });
  }
}
