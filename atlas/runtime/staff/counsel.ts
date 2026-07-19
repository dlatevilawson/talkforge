import type { WorkflowState } from "../types/envelopes";
import { runCognition } from "../modules/cognition";
import { runComposition } from "../modules/composition";
import { hasEvent, publish } from "./bus";
import { assertOfficeEnabled } from "./fault";
import { recordExecution } from "./metrics";
import { getOfficePack } from "./offices/packs";

function std003Complete(state: WorkflowState): boolean {
  const r = state.reasoning;
  const rec = state.recommendation;
  if (!r || !rec) return false;
  return (
    Boolean(r.objective) &&
    r.evidence.length > 0 &&
    r.alternatives.length >= 1 &&
    r.risks.length >= 0 &&
    rec.binding === false &&
    Boolean(rec.confidence)
  );
}

export function counselDraftPack(state: WorkflowState): WorkflowState {
  assertOfficeEnabled("AIO-COUNSEL");
  recordExecution("AIO-COUNSEL", "stage");
  void getOfficePack("AIO-COUNSEL").prompt;

  if (!hasEvent("atlas.intel.context_locked", state.request_id)) {
    return {
      ...state,
      error: "AIO-COUNSEL: refuse draft without context_locked",
    };
  }
  if (!state.context?.locked) {
    return { ...state, error: "AIO-COUNSEL: context not locked" };
  }

  let next = runCognition(state);
  if (next.error) return next;
  next = runComposition(next);

  const complete = std003Complete(next);
  if (complete) {
    publish({
      name: "atlas.counsel.pack_ready",
      at: new Date().toISOString(),
      request_id: next.request_id,
      publisher: "AIO-COUNSEL",
      payload: {
        pack_id: next.recommendation?.recommendation_id ?? `pack-${next.request_id}`,
        request_id: next.request_id,
        pack_type: next.recommendation?.type ?? "standard",
        std003_complete: true,
      },
    });
  }

  return next;
}
