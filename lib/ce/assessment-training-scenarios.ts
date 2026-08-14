/**
 * Diagnosis → training scenarios (pure).
 *
 * Downstream of AssessmentDiagnosis only — never raw slots, never the static
 * training-focus catalog defaults (interruption / saying no / etc.).
 */

import type {
  AssessmentDiagnosis,
  AssessmentMechanismId,
  TrainingImplication,
} from "./assessment-synthesis.ts";

export type TrainingScenario = {
  title: string;
  mission: string;
  evidenceRefs: string[];
  trainingImplicationId?: string;
  mechanismId?: AssessmentMechanismId | null;
};

const UNSUPPORTED_DEFAULT_TARGETS =
  /\b(interruption recovery|recover instantly when interrupted|saying no|say no without|executive presence|command the room|get paid what|own the call|extreme pressure|emotional conversations without choking)\b/i;

function refsFromDiagnosis(diagnosis: AssessmentDiagnosis): string[] {
  const refs: string[] = [];
  for (const tip of diagnosis.trainingImplications) {
    for (const r of tip.evidenceRefs) {
      if (r?.trim()) refs.push(r.trim());
    }
  }
  if (diagnosis.evidence?.trim()) refs.push(diagnosis.evidence.trim());
  if (diagnosis.keyEnvironments?.trim()) refs.push(diagnosis.keyEnvironments.trim());
  if (diagnosis.rootPattern?.trim()) refs.push(diagnosis.rootPattern.trim());
  // Dedupe, drop interaction-signal-like short rejects
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of refs) {
    const key = r.toLowerCase();
    if (seen.has(key)) continue;
    if (/^(i don'?t know|i can'?t remember|i cannot remember)\b/i.test(r)) continue;
    if (/^small talk$/i.test(r.trim())) continue;
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, 4);
}

function scenarioFromImplication(
  tip: TrainingImplication,
  diagnosis: AssessmentDiagnosis
): TrainingScenario {
  const env = diagnosis.keyEnvironments || diagnosis.contexts || "the situations you described";
  const evidenceRefs =
    tip.evidenceRefs.length > 0 ? tip.evidenceRefs : refsFromDiagnosis(diagnosis);

  const titles: Partial<Record<string, string>> = {
    retrieval_realtime: "Retrieve one clear line in real time",
    idea_formation: "Form one point before you speak",
    compression: "Lead with the point — compress the rest",
    pressure_response: "Answer under on-the-spot pressure",
    group_entry_timing: "Enter the group before the topic moves",
    small_talk_openings: "Open and join unscripted small talk",
    audience_lead: "Lead with what the audience needs",
    authority_presence: "Hold your point with higher-status listeners",
    clear_pushback: "Push back calmly without dropping the point",
    reduce_self_monitor: "Finish one thought with less self-monitoring",
    observed_fluency: "Stay fluent while feeling observed",
    deescalate_response: "Stay measured when challenged",
    clarify_mechanism: "Clarify the bottleneck with short recognition drills",
    general_clarity: "Clearer spontaneous speaking",
  };

  return {
    title: titles[tip.id] ?? tip.statement.slice(0, 72),
    mission: tip.statement.includes(env)
      ? tip.statement
      : `${tip.statement} Context: ${env}.`,
    evidenceRefs,
    trainingImplicationId: tip.id,
    mechanismId: tip.mechanismId,
  };
}

/**
 * Build practice scenarios from diagnosis / training implications only.
 * Returns [] when diagnosis lacks evidence-backed implications.
 */
export function buildTrainingScenarios(
  diagnosis: AssessmentDiagnosis | null | undefined
): TrainingScenario[] {
  if (!diagnosis) return [];
  // Do not specialize scenarios until diagnosis is evidence-supported.
  if (diagnosis.diagnosticConfidence === "low") return [];
  if (diagnosis.diagnosticConfidence === "provisional") {
    if (
      !diagnosis.uncertainty ||
      (diagnosis.discriminatingEvidenceCount ?? 0) === 0
    ) {
      return [];
    }
    const refs = refsFromDiagnosis(diagnosis).filter(
      (r) =>
        !/^small talk$/i.test(r.trim()) &&
        !/mechanism still being clarified/i.test(r)
    );
    if (refs.length === 0) return [];
    return [
      {
        title: "Clarify the speaking bottleneck",
        mission:
          "Use one discriminating contrast drill before specializing. Avoid unrelated specialty targets.",
        evidenceRefs: refs,
        trainingImplicationId: "clarify_mechanism",
        mechanismId: null,
      },
    ];
  }
  if (diagnosis.diagnosticConfidence && diagnosis.diagnosticConfidence !== "supported") {
    return [];
  }

  const refs = refsFromDiagnosis(diagnosis);
  if (refs.length === 0 && diagnosis.trainingImplications.length === 0) {
    return [];
  }

  const fromTips = diagnosis.trainingImplications.map((tip) =>
    scenarioFromImplication(tip, diagnosis)
  );

  // If implications empty but we have a distinguished mechanism, synthesize one
  // traceable scenario from focus/root/env — still not catalog defaults.
  if (fromTips.length === 0 && diagnosis.mechanismId && diagnosis.focusArea) {
    fromTips.push({
      title: diagnosis.focusArea.slice(0, 72),
      mission: `Train: ${diagnosis.rootPattern || diagnosis.focusArea}. Practice in: ${diagnosis.keyEnvironments || diagnosis.contexts}.`,
      evidenceRefs: refs,
      mechanismId: diagnosis.mechanismId,
    });
  }

  // Uncertainty path — clarify, don't invent specialty targets.
  if (
    fromTips.length === 0 &&
    diagnosis.uncertainty &&
    refs.length > 0
  ) {
    fromTips.push({
      title: "Clarify the speaking bottleneck",
      mission:
        "Use short recognition drills to distinguish the competing mechanisms before specializing. Do not assume interruption recovery, saying no, or executive presence.",
      evidenceRefs: refs,
      trainingImplicationId: "clarify_mechanism",
      mechanismId: null,
    });
  }

  return fromTips.filter((s) => {
    if (UNSUPPORTED_DEFAULT_TARGETS.test(s.title)) return false;
    if (UNSUPPORTED_DEFAULT_TARGETS.test(s.mission)) return false;
    // Must be traceable
    return s.evidenceRefs.length > 0 || Boolean(s.trainingImplicationId);
  });
}

/** Primary practice href from first recommended scenario (query title only). */
export function trainingScenarioPracticeHref(
  scenarios: TrainingScenario[]
): string {
  const first = scenarios[0];
  if (!first?.title) return "/app/practice?start=1";
  const title = encodeURIComponent(first.title);
  return `/app/practice?start=1&title=${title}`;
}
