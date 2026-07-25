import type { ValidationResult, ValidationVerdict, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

type StageCheck = { id: string; ok: boolean; note: string };

function checks(state: WorkflowState): StageCheck[] {
  const rec = state.recommendation;
  return [
    {
      id: "V1-Structure",
      ok: Boolean(state.request && state.authority && rec),
      note: "Request, authority, and recommendation present",
    },
    {
      id: "V2-Authority",
      ok: state.authority?.result === "pass" || state.authority?.result === "escalate",
      note: "Authority verdict recorded",
    },
    {
      id: "V3-Knowledge",
      ok:
        (state.context?.items.every((i) => Boolean(i.authority_label && i.plane)) ??
          false) &&
        !(state.context?.items.some((i) => i.status.toLowerCase() === "scaffold") ?? false),
      note: "All context items labeled; no scaffold-as-institutional",
    },
    {
      id: "V4-Evidence-Trace",
      ok: (state.reasoning?.evidence.length ?? 0) > 0 && state.audit.length > 0,
      note: "Evidence and audit trail present",
    },
    {
      id: "V5-Reasoning-Fidelity",
      ok:
        Boolean(state.reasoning) &&
        (state.reasoning?.alternatives.length ?? 0) >= 1 &&
        state.context?.locked === true,
      note: "Reasoning used locked context with alternatives",
    },
    {
      id: "V6-Collaboration",
      ok: true,
      note: "No domain absorption in this path",
    },
    {
      id: "V7-Escalation-Compliance",
      ok: rec ? rec.binding === false : false,
      note: "Non-binding posture enforced",
    },
    {
      id: "V8-Output-Posture",
      ok: rec ? rec.binding === false && !/I (decide|order|command)/i.test(rec.recommendation) : false,
      note: "Output does not claim Founder authority",
    },
  ];
}

/**
 * rt.integrity — hard gate before Founder-visible output.
 * No urgency bypass.
 */
export function runIntegrity(state: WorkflowState): WorkflowState {
  const stageChecks = checks(state);
  const failed = stageChecks.filter((c) => !c.ok);
  let result: ValidationResult;

  if (failed.length === 0) {
    result = "PASS";
  } else if (failed.some((f) => f.id === "V2-Authority" || f.id === "V3-Knowledge")) {
    result = "STOP";
  } else if (state.recommendation?.escalation) {
    result = "ESCALATE";
  } else {
    result = "RETURN";
  }

  const verdict: ValidationVerdict = {
    request_id: state.request_id,
    result,
    failed_stages: failed.map((f) => f.id),
    notes: stageChecks.map((c) => `${c.id}: ${c.ok ? "ok" : "FAIL"} — ${c.note}`),
  };

  let next: WorkflowState = {
    ...state,
    validation: verdict,
    stage: "integrity",
  };
  next = traceStage(next, "integrity", `ValidationVerdict=${result}`, verdict.failed_stages);
  if (result !== "PASS" && result !== "ESCALATE") {
    next = { ...next, error: `Integrity ${result}` };
  }
  return next;
}
