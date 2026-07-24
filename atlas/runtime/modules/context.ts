import type { ContextBundle, KnowledgeItem, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

const LABEL_RANK: Record<string, number> = {
  authoritative: 6,
  canonical: 5,
  operational: 4,
  legacy: 3,
  draft: 2,
  proposal: 1,
};

function preferHigher(a: KnowledgeItem, b: KnowledgeItem): number {
  return (LABEL_RANK[b.authority_label] ?? 0) - (LABEL_RANK[a.authority_label] ?? 0);
}

/**
 * Select smallest sufficient set — currently all labeled items, ordered by preference.
 * Scoring addendum deferred per ATLAS-P3.
 */
function selectItems(items: KnowledgeItem[]): KnowledgeItem[] {
  return [...items]
    .filter((item) => {
      if (!item.authority_label || !item.plane) return false;
      if (item.status.toLowerCase() === "scaffold") return false;
      return true;
    })
    .sort(preferHigher);
}

/**
 * rt.context — assemble and lock ContextBundle before cognition.
 * Never accepts raw memory handles.
 */
export function runContext(state: WorkflowState): WorkflowState {
  if (!state.knowledge?.length) {
    let next: WorkflowState = { ...state, stage: "context" as const };
    next = traceStage(next, "context", "Blocked: no labeled knowledge");
    return { ...next, error: "Context requires labeled KnowledgeItem[]" };
  }

  const unlabeled = state.knowledge.filter((i) => !i.authority_label || !i.plane);
  if (unlabeled.length > 0) {
    let next: WorkflowState = { ...state, stage: "context" as const };
    next = traceStage(next, "context", "Fail-closed: unlabeled knowledge rejected", [
      ...unlabeled.map((i) => i.source_id),
    ]);
    return { ...next, error: "Unlabeled KnowledgeItem cannot enter Context" };
  }

  const selected = selectItems(state.knowledge);
  const bundle: ContextBundle = {
    request_id: state.request_id,
    items: selected,
    objective: state.request?.intent ?? "",
    constraints: [
      "recommend-not-decide",
      "no-invention",
      "labels-immutable",
      "locked-before-reasoning",
    ],
    assembled_at: new Date().toISOString(),
    locked: true,
  };

  let next: WorkflowState = {
    ...state,
    context: bundle,
    stage: "context",
  };
  next = traceStage(
    next,
    "context",
    `ContextBundle locked with ${selected.length} items`,
    selected.map((i) => `${i.source_id}:${i.authority_label}`)
  );
  return next;
}
