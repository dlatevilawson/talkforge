import "server-only";

import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildShadowEvaluationPrompt,
  SHADOW_OUTPUT_JSON_SCHEMA,
  type ShadowEvaluationInput,
  type ShadowTranscriptTurn,
} from "./shadow-contract.ts";
import {
  runShadowReadinessEvaluation,
  scenarioFamilyFrom,
  type ShadowAssessment,
  type ShadowRunFinalization,
  type ShadowRunReservation,
  type ShadowRunResult,
} from "./shadow-runner.ts";

const MODEL_TIMEOUT_MS = 20_000;

type SessionRow = {
  id: string;
  user_id: string;
  scenario_id: string | null;
  scenario_title: string | null;
  modality: "voice" | "text" | null;
  completed_at: string | null;
};

type ReportRow = {
  transcript: Array<{ role?: unknown; text?: unknown }> | null;
};

function transcriptTurns(report: ReportRow): ShadowTranscriptTurn[] {
  if (!Array.isArray(report.transcript)) return [];
  return report.transcript.flatMap((turn, index) => {
    if (
      (turn.role !== "user" && turn.role !== "coach") ||
      typeof turn.text !== "string" ||
      !turn.text.trim()
    ) {
      return [];
    }
    return [
      {
        id: `turn-${index + 1}`,
        role: turn.role === "user" ? "member" : "counterpart",
        text: turn.text.trim(),
      } satisfies ShadowTranscriptTurn,
    ];
  });
}

async function evaluateWithModel(input: ShadowEvaluationInput, model: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("MODEL_UNCONFIGURED");
  const client = new OpenAI({
    apiKey,
    timeout: MODEL_TIMEOUT_MS,
    maxRetries: 0,
  });
  const response = await client.responses.create({
    model,
    input: buildShadowEvaluationPrompt(input),
    text: {
      format: {
        type: "json_schema",
        name: "talkforge_readiness_shadow_v1",
        strict: true,
        schema: SHADOW_OUTPUT_JSON_SCHEMA,
      },
    },
  });
  let output: unknown = response.output_text;
  try {
    output = JSON.parse(response.output_text);
  } catch {
    // Preserve provider usage in the audit row; contract validation will reject
    // the non-object output without storing the raw response.
  }
  return {
    output,
    model: response.model,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

async function reserveShadowRun(
  admin: SupabaseClient,
  run: ShadowRunReservation
): Promise<"reserved" | "duplicate"> {
  const inserted = await admin.from("session_readiness_shadow_runs").insert({
    id: run.id,
    session_id: run.sessionId,
    user_id: run.userId,
    rubric_version: run.rubricVersion,
    assessment_revision: run.assessmentRevision,
    model: run.model,
    status: "pending",
  });
  if (!inserted.error) return "reserved";
  if (inserted.error.code === "23505") return "duplicate";
  throw new Error("AUDIT_RESERVE");
}

async function finalizeShadowRun(
  admin: SupabaseClient,
  run: ShadowRunFinalization
): Promise<void> {
  const updated = await admin
    .from("session_readiness_shadow_runs")
    .update({
      status: run.status,
      model: run.model,
      input_tokens: run.inputTokens,
      output_tokens: run.outputTokens,
      assessment_id: run.assessmentId,
      error_code: run.errorCode,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .eq("status", "pending")
    .select("id")
    .single();
  if (updated.error || updated.data?.id !== run.id) {
    throw new Error("AUDIT_FINALIZE");
  }
}

async function persistAssessment(
  admin: SupabaseClient,
  assessment: ShadowAssessment
): Promise<{ status: "persisted" | "duplicate"; assessmentId: string }> {
  const existing = await admin
    .from("session_readiness_assessments")
    .select("id")
    .eq("session_id", assessment.sessionId)
    .eq("rubric_version", assessment.rubricVersion)
    .eq("assessment_revision", assessment.assessmentRevision)
    .maybeSingle();
  if (existing.error) throw new Error("ASSESSMENT_LOOKUP");
  if (existing.data?.id) {
    return { status: "duplicate", assessmentId: existing.data.id as string };
  }

  const inserted = await admin
    .from("session_readiness_assessments")
    .insert({
      session_id: assessment.sessionId,
      user_id: assessment.userId,
      rubric_version: assessment.rubricVersion,
      assessment_revision: assessment.assessmentRevision,
      scenario_family: assessment.scenarioFamily,
      session_purpose: assessment.sessionPurpose,
      modality: assessment.modality,
      pressure_level: assessment.pressureLevel,
      overall_band: assessment.overallBand,
      primary_focus_signal: assessment.primaryFocusSignal,
    })
    .select("id")
    .single();

  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const raced = await admin
        .from("session_readiness_assessments")
        .select("id")
        .eq("session_id", assessment.sessionId)
        .eq("rubric_version", assessment.rubricVersion)
        .eq("assessment_revision", assessment.assessmentRevision)
        .single();
      if (raced.error || !raced.data?.id) throw new Error("ASSESSMENT_RACE");
      return { status: "duplicate", assessmentId: raced.data.id as string };
    }
    throw new Error("ASSESSMENT_INSERT");
  }
  const assessmentId = inserted.data.id as string;

  try {
    const signalRows = assessment.output.signals.map((signal) => ({
      assessment_id: assessmentId,
      user_id: assessment.userId,
      signal: signal.signal,
      level: signal.level,
      null_reason: signal.nullReason,
      evidence_strength: signal.evidenceStrength,
      summary: signal.summary,
    }));
    const signals = await admin
      .from("session_readiness_signals")
      .insert(signalRows);
    if (signals.error) throw new Error("SIGNAL_INSERT");

    const evidenceRows = assessment.output.signals.flatMap((signal) =>
      signal.evidence.map((evidence) => ({
        assessment_id: assessmentId,
        user_id: assessment.userId,
        signal: signal.signal,
        evidence_type: evidence.evidenceType,
        turn_id: evidence.turnId,
        occurred_at_ms: null,
        snippet: evidence.snippet,
      }))
    );
    if (evidenceRows.length > 0) {
      const evidence = await admin
        .from("session_readiness_evidence")
        .insert(evidenceRows);
      if (evidence.error) throw new Error("EVIDENCE_INSERT");
    }
    return { status: "persisted", assessmentId };
  } catch (error) {
    await admin
      .from("session_readiness_assessments")
      .delete()
      .eq("id", assessmentId);
    throw error;
  }
}

export async function evaluateCompletedSessionInShadow(input: {
  sessionId: string;
  userId: string;
}): Promise<ShadowRunResult> {
  const model = process.env.OPENAI_READINESS_MODEL?.trim();
  if (!process.env.OPENAI_API_KEY?.trim() || !model) {
    return { status: "skipped", code: "MODEL_UNCONFIGURED" };
  }
  const admin = createAdminSupabaseClient();
  const sessionResult = await admin
    .from("practice_sessions")
    .select(
      "id, user_id, scenario_id, scenario_title, modality, completed_at"
    )
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (sessionResult.error) return { status: "failed", code: "SESSION_LOOKUP" };
  const session = sessionResult.data as SessionRow | null;
  if (!session?.completed_at) {
    return { status: "skipped", code: "SESSION_NOT_COMPLETED" };
  }

  const reportResult = await admin
    .from("session_reports")
    .select("transcript")
    .eq("session_id", input.sessionId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (reportResult.error) return { status: "failed", code: "REPORT_LOOKUP" };
  if (!reportResult.data) return { status: "skipped", code: "REPORT_MISSING" };

  return runShadowReadinessEvaluation(
    {
      sessionId: session.id,
      userId: session.user_id,
      scenarioFamily: scenarioFamilyFrom({
        scenarioId: session.scenario_id,
        scenarioTitle: session.scenario_title,
      }),
      scenarioTitle: session.scenario_title?.trim() || "Untitled practice",
      sessionPurpose: "free_practice",
      modality: session.modality === "voice" ? "voice" : "text",
      transcript: transcriptTurns(reportResult.data as ReportRow),
    },
    {
      model,
      reserve: (run) => reserveShadowRun(admin, run),
      evaluate: (evaluationInput) => evaluateWithModel(evaluationInput, model),
      persist: (assessment) => persistAssessment(admin, assessment),
      finalize: (run) => finalizeShadowRun(admin, run),
    }
  );
}
