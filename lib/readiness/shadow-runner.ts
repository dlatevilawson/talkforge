import {
  deriveReadinessBand,
  type ReadinessBand,
  type ReadinessSignal,
  type SessionPurpose,
} from "./measurement.ts";
import {
  SHADOW_MAX_TRANSCRIPT_BYTES,
  SHADOW_RUBRIC_VERSION,
  transcriptByteLength,
  validateShadowModelOutput,
  type ShadowEvaluationInput,
  type ValidatedShadowOutput,
} from "./shadow-contract.ts";

export type ShadowAssessment = {
  shadowRunId: string;
  sessionId: string;
  userId: string;
  rubricVersion: string;
  assessmentRevision: number;
  scenarioFamily: string;
  sessionPurpose: SessionPurpose;
  modality: "voice" | "text";
  pressureLevel: "low" | "moderate" | "high";
  overallBand: ReadinessBand | null;
  primaryFocusSignal: ReadinessSignal | null;
  output: ValidatedShadowOutput;
};

export type ShadowRunResult =
  | { status: "persisted" | "duplicate" }
  | { status: "skipped" | "failed"; code: string };

export type ShadowRunnerDeps = {
  model: string;
  createRunId?: () => string;
  reserve: (run: ShadowRunReservation) => Promise<"reserved" | "duplicate">;
  evaluate: (input: ShadowEvaluationInput) => Promise<ShadowModelEvaluation>;
  persist: (assessment: ShadowAssessment) => Promise<{
    status: "persisted" | "duplicate";
    assessmentId: string;
  }>;
  finalize: (run: ShadowRunFinalization) => Promise<void>;
};

export type ShadowRunReservation = {
  id: string;
  sessionId: string;
  userId: string;
  rubricVersion: string;
  assessmentRevision: number;
  model: string;
};

export type ShadowModelEvaluation = {
  output: unknown;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type ShadowRunFinalization = {
  id: string;
  status: "completed" | "failed";
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  assessmentId: string | null;
  errorCode: string | null;
};

export async function runShadowReadinessEvaluation(input: {
  sessionId: string;
  userId: string;
  scenarioFamily: string;
  scenarioTitle: string;
  sessionPurpose: SessionPurpose;
  modality: "voice" | "text";
  transcript: ShadowEvaluationInput["transcript"];
}, deps: ShadowRunnerDeps): Promise<ShadowRunResult> {
  const evaluationInput: ShadowEvaluationInput = {
    scenarioFamily: input.scenarioFamily,
    scenarioTitle: input.scenarioTitle,
    modality: input.modality,
    transcript: input.transcript,
  };

  if (input.transcript.filter((turn) => turn.role === "member").length < 2) {
    return { status: "skipped", code: "INSUFFICIENT_MEMBER_TURNS" };
  }
  if (transcriptByteLength(evaluationInput) > SHADOW_MAX_TRANSCRIPT_BYTES) {
    return { status: "skipped", code: "TRANSCRIPT_TOO_LARGE" };
  }

  const runId = deps.createRunId?.() ?? crypto.randomUUID();
  let reservation: "reserved" | "duplicate";
  try {
    reservation = await deps.reserve({
      id: runId,
      sessionId: input.sessionId,
      userId: input.userId,
      rubricVersion: SHADOW_RUBRIC_VERSION,
      assessmentRevision: 1,
      model: deps.model,
    });
  } catch {
    return { status: "failed", code: "AUDIT_RESERVE" };
  }
  if (reservation === "duplicate") return { status: "duplicate" };

  let evaluated: ShadowModelEvaluation;
  try {
    evaluated = await deps.evaluate(evaluationInput);
  } catch {
    try {
      await deps.finalize({
        id: runId,
        status: "failed",
        model: deps.model,
        inputTokens: null,
        outputTokens: null,
        assessmentId: null,
        errorCode: "MODEL_FAILURE",
      });
    } catch {
      return { status: "failed", code: "AUDIT_FINALIZE" };
    }
    return { status: "failed", code: "MODEL_FAILURE" };
  }

  const validated = validateShadowModelOutput(evaluated.output, input.transcript);
  if (!validated.ok) {
    try {
      await deps.finalize({
        id: runId,
        status: "failed",
        model: evaluated.model,
        inputTokens: evaluated.inputTokens,
        outputTokens: evaluated.outputTokens,
        assessmentId: null,
        errorCode: validated.code,
      });
    } catch {
      return { status: "failed", code: "AUDIT_FINALIZE" };
    }
    return { status: "failed", code: validated.code };
  }

  const band = deriveReadinessBand({
    purpose: input.sessionPurpose,
    observations: validated.value.signals.map((signal) => ({
      signal: signal.signal,
      level: signal.level,
      nullReason: signal.nullReason,
      evidenceStrength: signal.evidenceStrength,
    })),
  });

  const assessment: ShadowAssessment = {
    shadowRunId: runId,
    sessionId: input.sessionId,
    userId: input.userId,
    rubricVersion: SHADOW_RUBRIC_VERSION,
    assessmentRevision: 1,
    scenarioFamily: input.scenarioFamily,
    sessionPurpose: input.sessionPurpose,
    modality: input.modality,
    pressureLevel: validated.value.pressureLevel,
    overallBand: band.status === "derived" ? band.band : null,
    primaryFocusSignal:
      band.status === "derived" ? band.focusSignal : null,
    output: validated.value,
  };

  try {
    const persisted = await deps.persist(assessment);
    await deps.finalize({
      id: runId,
      status: "completed",
      model: evaluated.model,
      inputTokens: evaluated.inputTokens,
      outputTokens: evaluated.outputTokens,
      assessmentId: persisted.assessmentId,
      errorCode: null,
    });
    return { status: persisted.status };
  } catch {
    try {
      await deps.finalize({
        id: runId,
        status: "failed",
        model: evaluated.model,
        inputTokens: evaluated.inputTokens,
        outputTokens: evaluated.outputTokens,
        assessmentId: null,
        errorCode: "PERSIST_FAILURE",
      });
    } catch {
      return { status: "failed", code: "AUDIT_FINALIZE" };
    }
    return { status: "failed", code: "PERSIST_FAILURE" };
  }
}

export function shadowEvaluationAllowed(
  userId: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.READINESS_SHADOW_ENABLED?.trim().toLowerCase() !== "true") {
    return false;
  }
  const allowed = new Set(
    (env.READINESS_SHADOW_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return allowed.has(userId);
}

export function scenarioFamilyFrom(input: {
  scenarioId?: string | null;
  scenarioTitle?: string | null;
}): string {
  const raw = input.scenarioId?.trim() || input.scenarioTitle?.trim() || "unknown";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return normalized || "unknown";
}
