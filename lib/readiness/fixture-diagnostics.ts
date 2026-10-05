import type { ValidatedShadowOutput } from "./shadow-contract.ts";

export const READINESS_FIXTURE_RUNS = 3;
export const DEFAULT_READINESS_FIXTURE_TIMEOUT_MS = 120_000;
export const MIN_READINESS_FIXTURE_TIMEOUT_MS = 30_000;
export const MAX_READINESS_FIXTURE_TIMEOUT_MS = 300_000;

const SAFE_PROVIDER_VALUE = /^[A-Za-z0-9_.:/-]+$/;

function safeProviderValue(value: unknown, maxLength = 160): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean || clean.length > maxLength || !SAFE_PROVIDER_VALUE.test(clean)) {
    return null;
  }
  return clean;
}

export type SanitizedProviderError = {
  providerErrorClass: string | null;
  providerErrorType: string | null;
  providerErrorCode: string | null;
  providerStatus: number | null;
  providerRequestId: string | null;
};

export type FixtureFailureReasonCode =
  | "PRESSURE_MISMATCH"
  | "NULL_VIOLATION"
  | "INJECTION_AS_EVIDENCE"
  | "LEVEL_OFF_BY_N"
  | "FORBIDDEN_LANGUAGE"
  | "EVIDENCE_UNTRACEABLE"
  | "SCHEMA_INVALID";

export type FixtureFailureRecord = {
  fixtureId: string;
  signal: string;
  expected: string;
  actual: string;
  reasonCode: FixtureFailureReasonCode;
  note?: string;
};

const SAFE_FIXTURE_DIAGNOSTIC_VALUE = /^[A-Za-z0-9_.:>=() -]+$/;

function safeFixtureDiagnosticValue(value: string, maxLength = 160): string {
  const clean = value.trim();
  if (
    !clean ||
    clean.length > maxLength ||
    !SAFE_FIXTURE_DIAGNOSTIC_VALUE.test(clean)
  ) {
    throw new Error("Unsafe fixture diagnostic metadata.");
  }
  return clean;
}

export function createFixtureFailureRecord(
  record: FixtureFailureRecord
): FixtureFailureRecord {
  return {
    fixtureId: safeFixtureDiagnosticValue(record.fixtureId, 100),
    signal: safeFixtureDiagnosticValue(record.signal, 40),
    expected: safeFixtureDiagnosticValue(record.expected),
    actual: safeFixtureDiagnosticValue(record.actual),
    reasonCode: record.reasonCode,
    ...(record.note
      ? { note: safeFixtureDiagnosticValue(record.note, 200) }
      : {}),
  };
}

export function sanitizeOpenAIError(error: unknown): SanitizedProviderError {
  const candidate =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : null;
  const constructorName =
    candidate &&
    candidate.constructor &&
    typeof candidate.constructor === "function"
      ? candidate.constructor.name
      : null;
  const status = candidate?.status;

  return {
    providerErrorClass:
      safeProviderValue(constructorName) ?? safeProviderValue(candidate?.name),
    providerErrorType: safeProviderValue(candidate?.type),
    providerErrorCode: safeProviderValue(candidate?.code),
    providerStatus:
      typeof status === "number" && Number.isInteger(status) ? status : null,
    providerRequestId: safeProviderValue(candidate?.requestID),
  };
}

export function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Expected an integer from ${minimum} through ${maximum}.`);
  }
  return parsed;
}

export type FixtureCostRates = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

export function estimateFixtureCostUsd(
  inputTokens: number,
  outputTokens: number,
  rates: FixtureCostRates | null
): number | null {
  if (!rates) return null;
  return (
    (inputTokens * rates.inputUsdPerMillion +
      outputTokens * rates.outputUsdPerMillion) /
    1_000_000
  );
}

export type StabilityInput = {
  id: string;
  run: number;
  output: ValidatedShadowOutput | null;
};

export function summarizeFixtureStability(entries: StabilityInput[]) {
  const groups = new Map<string, StabilityInput[]>();
  for (const entry of entries) {
    const group = groups.get(entry.id) ?? [];
    group.push(entry);
    groups.set(entry.id, group);
  }

  let signalCells = 0;
  let assessedNullStable = 0;
  let evidenceStrengthStable = 0;
  let exactLevelStable = 0;
  let withinOneLevelStable = 0;
  const notEvaluable: string[] = [];

  for (const [id, group] of groups) {
    const ordered = [...group].sort((a, b) => a.run - b.run);
    if (
      ordered.length !== READINESS_FIXTURE_RUNS ||
      ordered.some((entry) => !entry.output)
    ) {
      notEvaluable.push(id);
      continue;
    }

    const outputs = ordered.map((entry) => entry.output!);
    for (const baseline of outputs[0].signals) {
      const signals = outputs.map((output) =>
        output.signals.find((signal) => signal.signal === baseline.signal)
      );
      if (signals.some((signal) => !signal)) {
        notEvaluable.push(id);
        continue;
      }
      const present = signals.map((signal) => signal!);
      signalCells += 1;

      const assessed = present.map((signal) => signal.level !== null);
      if (assessed.every((value) => value === assessed[0])) {
        assessedNullStable += 1;
      }
      if (
        present.every(
          (signal) => signal.evidenceStrength === present[0].evidenceStrength
        )
      ) {
        evidenceStrengthStable += 1;
      }

      const levels = present.map((signal) => signal.level);
      if (levels.every((level) => level === levels[0])) exactLevelStable += 1;
      if (
        levels.every((level) => level !== null) &&
        Math.max(...(levels as number[])) - Math.min(...(levels as number[])) <= 1
      ) {
        withinOneLevelStable += 1;
      } else if (levels.every((level) => level === null)) {
        withinOneLevelStable += 1;
      }
    }
  }

  const percentage = (value: number) =>
    signalCells === 0 ? null : Number(((value / signalCells) * 100).toFixed(2));

  return {
    evaluable: notEvaluable.length === 0 && signalCells > 0,
    signalCells,
    assessedVsNullPercent: percentage(assessedNullStable),
    exactEvidenceStrengthPercent: percentage(evidenceStrengthStable),
    exactLevelPercent: percentage(exactLevelStable),
    withinOneLevelPercent: percentage(withinOneLevelStable),
    notEvaluable: [...new Set(notEvaluable)].sort(),
  };
}
