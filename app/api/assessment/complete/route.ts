import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import {
  mapAssessmentSnapshotToLivingProfile,
  parseAssessmentSnapshot,
} from "@/lib/ce/assessment-lifecycle";
import {
  countConfusionAnswers,
  countTrailingConfusionAnswers,
  filterSubstantiveAnswers,
  isAssessmentReady,
  normalizePresenceScores,
  normalizeStringList,
  type AssessmentExtraction,
  type PresenceScores,
} from "@/lib/system1/assessment";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapLivingProfileRow } from "@/lib/system1/persistence";
import type { ProvenanceRecord } from "@/lib/system1/types";

export const runtime = "nodejs";

type TurnIn = {
  role?: string;
  text?: string;
};

/**
 * Transcript extract helpers below are retained for Step 8 cleanup only.
 * Step 7 LP writes use AssessmentSnapshot authority — do not call extractors
 * for goals/challenges/strengths when mapping the snapshot.
 */

function newProvId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `prov_assess_${crypto.randomUUID()}`;
  }
  return `prov_assess_${Date.now()}`;
}

function incompleteExtraction(
  extras?: Partial<AssessmentExtraction>
): AssessmentExtraction {
  return {
    goals: [],
    strengths: [],
    challenges: [],
    presenceScores: null,
    ready: false,
    abortedForDisengagement: false,
    confusionAnswerCount: 0,
    ...extras,
  };
}

function heuristicExtraction(userTexts: string[]): AssessmentExtraction {
  const confusionAnswerCount = countConfusionAnswers(userTexts);
  const trailingConfusion = countTrailingConfusionAnswers(userTexts);
  if (trailingConfusion >= 2) {
    return incompleteExtraction({
      abortedForDisengagement: true,
      confusionAnswerCount,
    });
  }

  const substantive = filterSubstantiveAnswers(userTexts);
  const joined = substantive.join(" ").trim();
  if (joined.length < 24 || substantive.length < 2) {
    return incompleteExtraction({ confusionAnswerCount });
  }

  const goals = [
    substantive[substantive.length - 1]?.slice(0, 160) ||
      "Communicate with more ease in the situations that matter.",
  ];
  const challenges = [
    substantive[0]?.slice(0, 160) ||
      "Communication feels harder than it should in key moments.",
  ];
  const strengths: string[] = [];
  const presenceScores: PresenceScores = {
    clarity: 5,
    composure: 5,
    confidence: 5,
    listening: 5,
    assertiveness: 5,
    presence: 5,
  };

  return {
    goals: normalizeStringList(goals),
    strengths,
    challenges: normalizeStringList(challenges),
    presenceScores,
    ready: isAssessmentReady(goals, challenges),
    corePattern: challenges[0],
    abortedForDisengagement: false,
    confusionAnswerCount,
  };
}

async function extractFromTranscript(
  lines: string[],
  userTexts: string[]
): Promise<AssessmentExtraction> {
  const confusionAnswerCount = countConfusionAnswers(userTexts);
  const trailingConfusion = countTrailingConfusionAnswers(userTexts);
  if (trailingConfusion >= 2) {
    return incompleteExtraction({
      abortedForDisengagement: true,
      confusionAnswerCount,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || lines.length === 0) {
    return heuristicExtraction(userTexts);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You extract a Living Profile assessment snapshot from a short Forge discovery interview.

Rules:
- Use ONLY substantive member answers about their communication.
- IGNORE process-confusion / disengagement answers (e.g. "why are you asking this?", "not sure what this is for", "can we just practice?"). Never put those into goals, strengths, or challenges.
- If two or more consecutive trailing user answers are process-confusion / disengagement, set ready=false, abortedForDisengagement=true, empty arrays, presence_scores=null.
- goals: what they want to be different / able to do (clear, concrete phrases) from substantive answers only.
- challenges: what specifically makes communication hard for them — never process meta-questions.
- strengths: only if they stated or clearly demonstrated one; else [].
- presence_scores: infer 1–10 integers for clarity, composure, confidence, listening, assertiveness, presence from conversation content alone. If evidence is thin, stay near 5 and avoid extreme scores.
- ready: true ONLY if there is at least one clear goal AND one clear challenge from substantive answers (not one-word / empty / confusion answers).
- corePattern: one short sentence of the core pattern they confirmed (or best read) — only from substantive content.

Transcript:
${lines.join("\n")}

Return ONLY valid JSON:
{
  "goals": ["..."],
  "strengths": ["..."],
  "challenges": ["..."],
  "presence_scores": {
    "clarity": 5,
    "composure": 5,
    "confidence": 5,
    "listening": 5,
    "assertiveness": 5,
    "presence": 5
  },
  "ready": true,
  "abortedForDisengagement": false,
  "confusionAnswerCount": 0,
  "corePattern": "..."
}
`,
    });

    const text =
      typeof completion.output_text === "string"
        ? completion.output_text
        : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return heuristicExtraction(userTexts);
    const parsed = JSON.parse(match[0]) as {
      goals?: unknown;
      strengths?: unknown;
      challenges?: unknown;
      presence_scores?: unknown;
      ready?: unknown;
      abortedForDisengagement?: unknown;
      confusionAnswerCount?: unknown;
      corePattern?: unknown;
    };

    const aborted =
      parsed.abortedForDisengagement === true || trailingConfusion >= 2;
    if (aborted) {
      return incompleteExtraction({
        abortedForDisengagement: true,
        confusionAnswerCount:
          typeof parsed.confusionAnswerCount === "number"
            ? parsed.confusionAnswerCount
            : confusionAnswerCount,
      });
    }

    // Defense in depth: never persist confusion-looking strings as profile fields.
    const goals = normalizeStringList(parsed.goals).filter(
      (g) => !g.toLowerCase().includes("why are you asking")
    );
    const strengths = normalizeStringList(parsed.strengths);
    const challenges = normalizeStringList(parsed.challenges).filter(
      (c) =>
        !c.toLowerCase().includes("why are you asking") &&
        !c.toLowerCase().includes("what this is for")
    );
    const ready =
      typeof parsed.ready === "boolean"
        ? parsed.ready && isAssessmentReady(goals, challenges)
        : isAssessmentReady(goals, challenges);
    const presenceScores = ready
      ? normalizePresenceScores(parsed.presence_scores)
      : null;

    return {
      goals,
      strengths,
      challenges,
      presenceScores,
      ready,
      abortedForDisengagement: false,
      confusionAnswerCount:
        typeof parsed.confusionAnswerCount === "number"
          ? parsed.confusionAnswerCount
          : confusionAnswerCount,
      corePattern:
        typeof parsed.corePattern === "string"
          ? parsed.corePattern.trim().slice(0, 220)
          : undefined,
    };
  } catch (err) {
    console.warn("[assessment] extract failed", err);
    return heuristicExtraction(userTexts);
  }
}

/**
 * Assessment session end — Living Profile write from AssessmentSnapshot (Step 7).
 * Does not generate a training plan. Transcript turns are evidence refs only.
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
