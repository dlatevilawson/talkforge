import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import {
  mapAssessmentSnapshotToLivingProfile,
  parseAssessmentSnapshot,
} from "@/lib/ce/assessment-lifecycle";
import { countConfusionAnswers } from "@/lib/system1/assessment";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapLivingProfileRow } from "@/lib/system1/persistence";
import type { ProvenanceRecord } from "@/lib/system1/types";

export const runtime = "nodejs";

type TurnIn = {
  role?: string;
  text?: string;
};

function newProvId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `prov_assess_${crypto.randomUUID()}`;
  }
  return `prov_assess_${Date.now()}`;
}

/**
 * Assessment session end — Living Profile write from AssessmentSnapshot.
 * Does not generate a training plan. Transcript turns are evidence refs only.
 * Transcript extractors removed (ASSESS-MIGRATE-001 Step 8).
 */
export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as {
      turns?: TurnIn[];
      practiceSessionId?: string;
      assessmentSnapshot?: unknown;
    };

    const turns = Array.isArray(body.turns) ? body.turns : [];
    const userTexts = turns
      .filter(
        (t) =>
          (t.role === "founder" || t.role === "user") &&
          typeof t.text === "string" &&
          t.text.trim()
      )
      .map((t) => t.text!.trim());

    // Snapshot is LP authority. Missing/invalid → incomplete (no transcript invent).
    const snapshot = parseAssessmentSnapshot(body.assessmentSnapshot);
    const supabase = await createServerSupabaseClient();

    const { data: currentRow, error: loadError } = await supabase
      .from("living_profiles")
      .select("*")
      .eq("user_id", gate.userId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { error: loadError.message || "Could not load Living Profile." },
        { status: 500 }
      );
    }
    if (!currentRow) {
      return NextResponse.json(
        { error: "Living Profile row missing. Refresh Home and try again." },
        { status: 409 }
      );
    }

    const current = mapLivingProfileRow(currentRow);
    const mapped = mapAssessmentSnapshotToLivingProfile(snapshot, {
      purposeStatement: current.purposeStatement,
    });
    const now = new Date().toISOString();
    const evidenceRef =
      typeof body.practiceSessionId === "string" && body.practiceSessionId
        ? body.practiceSessionId
        : "assessment_session";

    const provenance: ProvenanceRecord[] = [...current.provenance];
    if (mapped.ready) {
      provenance.unshift({
        id: newProvId(),
        fieldPath: "assessment_snapshot",
        claim: mapped.provenanceClaim,
        sourceKind: "session_observation",
        evidenceRefs: [evidenceRef],
        confidence: "medium",
        createdAt: now,
        updatedAt: now,
        memberConfirmed: false,
      });
    }

    // Incomplete: never fabricate goals/challenges/strengths (OWN-001).
    // Sufficient F3=A: omit presence_scores so existing scores stay untouched.
    const payload = mapped.ready
      ? {
          goals: mapped.goals ?? [],
          challenges: mapped.challenges ?? [],
          profile_source: "assessment" as const,
          provenance,
          version: current.version + 1,
          updated_at: now,
          ...(mapped.purposeStatement != null
            ? { purpose_statement: mapped.purposeStatement }
            : {}),
        }
      : {
          profile_source: "incomplete" as const,
          presence_scores: null,
          version: current.version + 1,
          updated_at: now,
          provenance,
        };

    const { data: saved, error: saveError } = await supabase
      .from("living_profiles")
      .update(payload)
      .eq("user_id", gate.userId)
      .eq("version", current.version)
      .select("*")
      .maybeSingle();

    if (saveError) {
      console.error("[assessment] save failed", saveError);
      return NextResponse.json(
        { error: saveError.message || "Could not save assessment snapshot." },
        { status: 500 }
      );
    }
    if (!saved) {
      return NextResponse.json(
        {
          error:
            "Living Profile changed while saving the assessment. Reload and try again.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    const profile = mapLivingProfileRow(saved);
    // Confusion telemetry from turns only — never drives LP field writes.
    const confusionAnswerCount = countConfusionAnswers(userTexts);
    return NextResponse.json({
      ready: mapped.ready,
      profileSource: profile.profileSource,
      abortedForDisengagement: false,
      confusionAnswerCount,
      extraction: {
        goals: profile.goals,
        strengths: profile.strengths,
        challenges: profile.challenges,
        presenceScores: profile.presenceScores,
        corePattern: mapped.ready
          ? (mapped.challenges?.[0] ?? null)
          : null,
      },
      profile,
    });
  } catch (err) {
    console.error("[assessment] complete failed", err);
    return NextResponse.json(
      { error: "Assessment wrap failed." },
      { status: 500 }
    );
  }
}
