import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import {
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

function newProvId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `prov_assess_${crypto.randomUUID()}`;
  }
  return `prov_assess_${Date.now()}`;
}

function heuristicExtraction(userTexts: string[]): AssessmentExtraction {
  const joined = userTexts.join(" ").trim();
  if (joined.length < 24 || userTexts.length < 2) {
    return {
      goals: [],
      strengths: [],
      challenges: [],
      presenceScores: null,
      ready: false,
    };
  }

  const goals = [
    userTexts[userTexts.length - 1]?.slice(0, 160) ||
      "Communicate with more ease in the situations that matter.",
  ];
  const challenges = [
    userTexts[0]?.slice(0, 160) ||
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
  };
}

async function extractFromTranscript(
  lines: string[],
  userTexts: string[]
): Promise<AssessmentExtraction> {
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
- Use ONLY what the member said. Do not invent biography.
- goals: what they want to be different / able to do (clear, concrete phrases).
- challenges: what specifically makes communication hard for them.
- strengths: only if they stated or clearly demonstrated one; else [].
- presence_scores: infer 1–10 integers for clarity, composure, confidence, listening, assertiveness, presence from conversation content alone. If evidence is thin, stay near 5 and avoid extreme scores.
- ready: true ONLY if there is at least one clear goal AND one clear challenge (not one-word / empty answers).
- corePattern: one short sentence of the core pattern they confirmed (or best read).

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
      corePattern?: unknown;
    };

    const goals = normalizeStringList(parsed.goals);
    const strengths = normalizeStringList(parsed.strengths);
    const challenges = normalizeStringList(parsed.challenges);
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
 * Assessment session end — readiness gate + Living Profile write (test slice).
 * Does not generate a training plan.
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

    const lines = turns
      .filter((t) => typeof t.text === "string" && t.text.trim())
      .map((t) => {
        const role =
          t.role === "founder" || t.role === "user" ? "You" : "Forge";
        return `${role}: ${t.text!.trim()}`;
      });

    const extraction = await extractFromTranscript(lines, userTexts);
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
    const now = new Date().toISOString();
    const evidenceRef =
      typeof body.practiceSessionId === "string" && body.practiceSessionId
        ? body.practiceSessionId
        : "assessment_session";

    const provenance: ProvenanceRecord[] = [...current.provenance];
    if (extraction.ready) {
      provenance.unshift({
        id: newProvId(),
        fieldPath: "assessment_snapshot",
        claim:
          extraction.corePattern ||
          "Assessment conversation captured goals and challenges.",
        sourceKind: "session_observation",
        evidenceRefs: [evidenceRef],
        confidence: "medium",
        createdAt: now,
        updatedAt: now,
        memberConfirmed: false,
      });
    }

    const payload = extraction.ready
      ? {
          goals: extraction.goals,
          strengths: extraction.strengths,
          challenges: extraction.challenges,
          presence_scores: extraction.presenceScores,
          profile_source: "assessment" as const,
          provenance,
          version: current.version + 1,
          updated_at: now,
          // Soft-sync purpose from first goal when empty — member can edit later.
          purpose_statement:
            current.purposeStatement.trim() ||
            extraction.goals[0] ||
            current.purposeStatement,
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
    return NextResponse.json({
      ready: extraction.ready,
      profileSource: profile.profileSource,
      extraction: {
        goals: profile.goals,
        strengths: profile.strengths,
        challenges: profile.challenges,
        presenceScores: profile.presenceScores,
        corePattern: extraction.corePattern ?? null,
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
