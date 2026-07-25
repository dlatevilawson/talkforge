import type { AuthorityVerdict, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

const FORBIDDEN_INTENTS = [
  /alter\s+(the\s+)?constitution/i,
  /publish\s+canonical/i,
  /override\s+sentinel/i,
  /make\s+(a\s+)?binding\s+decision/i,
  /set\s+priority\s+sovereign/i,
];

/**
 * rt.authority — enforce Atlas may/must-not before knowledge/reasoning.
 * Fail-closed: reject or escalate; never invent authority.
 */
export function runAuthority(state: WorkflowState): WorkflowState {
  if (!state.request) {
    const verdict: AuthorityVerdict = {
      request_id: state.request_id,
      result: "reject",
      reasons: ["Missing RequestEnvelope"],
      limits_applied: ["require-request"],
    };
    let next: WorkflowState = { ...state, authority: verdict, stage: "authority" as const };
    next = traceStage(next, "authority", "Reject: missing request");
    return { ...next, error: "Missing RequestEnvelope" };
  }

  const intent = state.request.intent;
  const limits: string[] = [
    "recommend-not-decide",
    "no-canonical-publish",
    "no-sentinel-override",
    "no-constitutional-edit",
  ];

  for (const pattern of FORBIDDEN_INTENTS) {
    if (pattern.test(intent)) {
      const verdict: AuthorityVerdict = {
        request_id: state.request_id,
        result: "escalate",
        reasons: [`Intent matches prohibited pattern: ${pattern}`],
        limits_applied: limits,
      };
      let next: WorkflowState = { ...state, authority: verdict, stage: "authority" as const };
      next = traceStage(next, "authority", "Escalate: prohibited authority intent", [
        pattern.source,
      ]);
      return next;
    }
  }

  const verdict: AuthorityVerdict = {
    request_id: state.request_id,
    result: "pass",
    reasons: ["Within Atlas delegated authority for counsel"],
    limits_applied: limits,
  };
  let next: WorkflowState = { ...state, authority: verdict, stage: "authority" as const };
  next = traceStage(next, "authority", "Authority pass", limits);
  return next;
}
