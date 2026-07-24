import { createHash } from "crypto";
import type { PipelineResult } from "../modules/hub";
import type { WorkflowState } from "../types/envelopes";

export type CriterionId =
  | "FV-1"
  | "FV-2"
  | "FV-3"
  | "FV-4"
  | "FV-5"
  | "FV-6"
  | "FV-7"
  | "FV-8";

export type CriterionResult = {
  id: CriterionId;
  name: string;
  pass: boolean;
  evidence: string[];
  failures: string[];
};

const FLOW_STAGES = [
  "ingress",
  "authority",
  "knowledge",
  "context",
  "cognition",
  "composition",
  "integrity",
] as const;

function fingerprint(state: WorkflowState): string {
  const payload = {
    authority: state.authority?.result,
    validation: state.validation?.result,
    recType: state.recommendation?.type,
    binding: state.recommendation?.binding,
    labels: (state.context?.items ?? []).map(
      (i) => `${i.source_id}:${i.authority_label}:${i.plane}`
    ),
    disposition: state.disposition?.class,
    dispositionCanonical: state.disposition?.canonical,
    auditCanonical: state.audit.map((a) => a.canonical),
    escalation: state.recommendation?.escalation,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function evaluateAuthority(
  runs: Array<{ scenarioId: string; result: PipelineResult; expectAuthority?: string }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    if (run.scenarioId === "S7") {
      // empty ingress — no authority stage required
      if (run.result.state.request) {
        failures.push("S7: empty message should not admit RequestEnvelope");
      } else {
        evidence.push("S7: empty request rejected at ingress (fail-closed)");
      }
      continue;
    }
    const actual = run.result.state.authority?.result;
    if (run.expectAuthority && actual !== run.expectAuthority) {
      failures.push(
        `${run.scenarioId}: authority expected ${run.expectAuthority}, got ${actual}`
      );
    } else {
      evidence.push(`${run.scenarioId}: authority=${actual}`);
    }
  }

  return {
    id: "FV-1",
    name: "Correct authority handling",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateEscalation(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];
  const esc = runs.filter((r) =>
    ["S3", "S4", "S5"].includes(r.scenarioId)
  );

  for (const run of esc) {
    const s = run.result.state;
    if (s.authority?.result !== "escalate") {
      failures.push(`${run.scenarioId}: authority not escalate`);
    }
    if (s.recommendation?.type !== "escalation") {
      failures.push(`${run.scenarioId}: recommendation type not escalation`);
    }
    if (s.recommendation?.binding !== false) {
      failures.push(`${run.scenarioId}: escalation binding must be false`);
    }
    if (run.result.delivery !== undefined) {
      failures.push(`${run.scenarioId}: Founder delivery must stay suppressed`);
    }
    if (!s.validation) {
      failures.push(`${run.scenarioId}: escalation must still hit Integrity`);
    } else {
      evidence.push(
        `${run.scenarioId}: escalate→artifact→Integrity=${s.validation.result}; delivery suppressed`
      );
    }
  }

  return {
    id: "FV-2",
    name: "Correct escalation behavior",
    pass: failures.length === 0 && esc.length > 0,
    evidence,
    failures,
  };
}

export function evaluateLabeling(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    const items = run.result.state.knowledge ?? run.result.state.context?.items;
    if (!items?.length) {
      if (
        run.scenarioId === "S7" ||
        run.result.state.authority?.result === "escalate"
      ) {
        evidence.push(`${run.scenarioId}: no knowledge path (expected)`);
        continue;
      }
      failures.push(`${run.scenarioId}: missing labeled knowledge/context`);
      continue;
    }
    for (const item of items) {
      if (!item.authority_label || !item.plane) {
        failures.push(`${run.scenarioId}: unlabeled item ${item.source_id}`);
      }
      if (
        item.status.toLowerCase() === "scaffold" &&
        (item.authority_label === "canonical" ||
          item.authority_label === "authoritative")
      ) {
        failures.push(`${run.scenarioId}: scaffold labeled as institutional`);
      }
    }
    evidence.push(
      `${run.scenarioId}: ${items.length} items labeled; planes=${[
        ...new Set(items.map((i) => i.plane)),
      ].join(",")}`
    );
  }

  return {
    id: "FV-3",
    name: "Proper knowledge labeling",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateNoCanonicalLeak(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    const s = run.result.state;
    for (const e of s.audit) {
      if (e.canonical !== false) {
        failures.push(`${run.scenarioId}: AuditEvent.canonical !== false`);
      }
    }
    if (s.disposition && s.disposition.canonical !== false) {
      failures.push(`${run.scenarioId}: disposition.canonical !== false`);
    }
    if (s.recommendation?.binding !== false && s.recommendation) {
      failures.push(`${run.scenarioId}: recommendation binding true`);
    }
    // Context must not present legacy as upgraded Canonical
    for (const item of s.context?.items ?? []) {
      if (item.plane === "legacy-atlas" && item.authority_label === "canonical") {
        failures.push(
          `${run.scenarioId}: legacy-atlas item labeled canonical (${item.source_id})`
        );
      }
    }
    evidence.push(
      `${run.scenarioId}: audit=${s.audit.length} all non-Canonical; disposition=${s.disposition?.class ?? "n/a"}`
    );
  }

  return {
    id: "FV-4",
    name: "No Canonical leakage",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateAuditTrails(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    const stages = run.result.state.audit.map((a) => a.stage);
    if (stages.length === 0) {
      failures.push(`${run.scenarioId}: empty audit trail`);
      continue;
    }
    if (!stages.includes("ingress")) {
      failures.push(`${run.scenarioId}: missing ingress audit`);
    }
    if (run.scenarioId === "S7") {
      evidence.push(`S7: ingress reject audited (${stages.join("→")})`);
      continue;
    }
    if (!stages.includes("authority")) {
      failures.push(`${run.scenarioId}: missing authority audit`);
    }
    if (
      run.result.state.authority?.result === "pass" &&
      !FLOW_STAGES.every((st) => stages.includes(st))
    ) {
      const missing = FLOW_STAGES.filter((st) => !stages.includes(st));
      failures.push(`${run.scenarioId}: incomplete flow audit missing ${missing.join(",")}`);
    } else if (run.result.state.authority?.result === "pass") {
      evidence.push(`${run.scenarioId}: full flow audited`);
    } else {
      evidence.push(`${run.scenarioId}: escalate path audited (${stages.join("→")})`);
    }
  }

  return {
    id: "FV-5",
    name: "Correct audit trails",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateRecommendationQuality(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    if (run.scenarioId === "S7") {
      evidence.push("S7: no recommendation (ingress fail) — OK");
      continue;
    }
    const rec = run.result.state.recommendation;
    if (!rec) {
      failures.push(`${run.scenarioId}: missing recommendation artifact`);
      continue;
    }
    if (rec.binding !== false) failures.push(`${run.scenarioId}: binding must be false`);
    if (!rec.recommendation.trim()) {
      failures.push(`${run.scenarioId}: empty recommendation text`);
    }
    if (rec.alternatives.length < 1 && rec.type !== "escalation") {
      failures.push(`${run.scenarioId}: alternatives required`);
    }
    if (/I (decide|order|command)\b/i.test(rec.recommendation)) {
      failures.push(`${run.scenarioId}: command language in recommendation`);
    }
    if (
      run.result.state.authority?.result === "pass" &&
      run.result.state.validation?.result !== "PASS"
    ) {
      failures.push(
        `${run.scenarioId}: expected Integrity PASS on counsel path, got ${run.result.state.validation?.result}`
      );
    }
    evidence.push(
      `${run.scenarioId}: type=${rec.type} binding=false confidence=${rec.confidence} validation=${run.result.state.validation?.result}`
    );
  }

  return {
    id: "FV-6",
    name: "Stable recommendation quality",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateNoSilentFailures(
  runs: Array<{ scenarioId: string; result: PipelineResult }>
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  for (const run of runs) {
    const s = run.result.state;
    if (run.scenarioId === "S7") {
      if (run.result.ok || !s.error) {
        // ok false and error set expected
        if (!s.error) failures.push("S7: silent failure — no error on empty ingress");
        else evidence.push("S7: failure surfaced via error");
      } else {
        evidence.push("S7: failure surfaced via error");
      }
      continue;
    }
    if (s.authority?.result === "escalate") {
      if (!s.recommendation || !s.validation) {
        failures.push(`${run.scenarioId}: escalation failed silently`);
      } else {
        evidence.push(`${run.scenarioId}: escalation surfaced through Integrity`);
      }
      continue;
    }
    if (!run.result.ok && !s.error && !s.validation) {
      failures.push(`${run.scenarioId}: failure without error or validation`);
    } else if (run.result.ok && s.validation?.result === "PASS") {
      evidence.push(`${run.scenarioId}: success explicit (ok + PASS)`);
    } else {
      evidence.push(
        `${run.scenarioId}: outcome explicit ok=${run.result.ok} validation=${s.validation?.result} error=${s.error ?? "none"}`
      );
    }
  }

  return {
    id: "FV-7",
    name: "No silent failures",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export function evaluateRepeatability(
  iterations: Array<
    Array<{ scenarioId: string; result: PipelineResult }>
  >
): CriterionResult {
  const failures: string[] = [];
  const evidence: string[] = [];

  if (iterations.length < 2) {
    return {
      id: "FV-8",
      name: "Repeatable behavior over time",
      pass: false,
      evidence: [],
      failures: ["Need at least 2 iterations"],
    };
  }

  const byScenario = new Map<string, string[]>();
  for (const iter of iterations) {
    for (const run of iter) {
      if (run.scenarioId === "S7") continue;
      const fp = fingerprint(run.result.state);
      const list = byScenario.get(run.scenarioId) ?? [];
      list.push(fp);
      byScenario.set(run.scenarioId, list);
    }
  }

  for (const [scenarioId, fps] of byScenario) {
    const unique = new Set(fps);
    if (unique.size !== 1) {
      failures.push(
        `${scenarioId}: non-repeatable fingerprints (${unique.size} variants across ${fps.length} runs)`
      );
    } else {
      evidence.push(
        `${scenarioId}: identical behavior fingerprint across ${fps.length} iterations (${fps[0].slice(0, 12)}…)`
      );
    }
  }

  return {
    id: "FV-8",
    name: "Repeatable behavior over time",
    pass: failures.length === 0,
    evidence,
    failures,
  };
}

export { fingerprint };
