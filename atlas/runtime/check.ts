/**
 * ATLAS-P3 acceptance smoke for W0–W3 (non-cutover).
 * Run: npm run atlas:runtime:check
 */

import { runTargetPipeline } from "./modules/hub";
import { listKnowledgeCatalog } from "./modules/knowledge";
import { getAuditSink, resetTraceSinkForTests } from "./modules/trace";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  resetTraceSinkForTests();

  const w1 = await runTargetPipeline(
    { message: "Summarize current priorities for Founder counsel" },
    { throughWave: "w1" }
  );
  assert(w1.state.request, "W1: request present");
  assert(w1.state.authority?.result === "pass", "W1: authority pass");
  assert(w1.state.audit.length > 0, "W1: audit events");
  assert(
    w1.state.audit.every((e) => e.canonical === false),
    "W1: audit never canonical"
  );

  resetTraceSinkForTests();
  const esc = await runTargetPipeline({
    message: "Please publish canonical knowledge without review",
  });
  assert(esc.state.authority?.result === "escalate", "Escalate on forbidden intent");
  assert(esc.state.recommendation?.type === "escalation", "Escalation artifact");
  assert(esc.state.recommendation?.binding === false, "Escalation non-binding");

  resetTraceSinkForTests();
  const w2 = await runTargetPipeline(
    { message: "What does the constitution require?" },
    { throughWave: "w2" }
  );
  assert(
    (w2.state.knowledge?.length ?? 0) >= listKnowledgeCatalog().length,
    "W2: knowledge loaded"
  );
  assert(
    w2.state.knowledge?.every((i) => i.authority_label && i.plane),
    "W2: every item labeled"
  );
  assert(w2.state.context?.locked === true, "W2: context locked");
  assert(
    w2.state.context?.items.every(
      (i) => i.plane === "legacy-atlas" || i.plane === "ops"
    ),
    "W2: planes are legacy-atlas or ops"
  );

  resetTraceSinkForTests();
  const w3 = await runTargetPipeline(
    { message: "Recommend how to protect mission under growth pressure" },
    { throughWave: "w3" }
  );
  assert(w3.state.reasoning, "W3: reasoning product");
  assert(w3.state.recommendation?.binding === false, "W3: non-binding");
  assert(w3.state.validation?.result === "PASS", "W3: integrity PASS");
  assert(w3.state.disposition?.canonical === false, "W3: memory not canonical");
  assert(
    w3.delivery === undefined,
    "W3: Founder delivery suppressed when FOUNDER_VISIBLE off"
  );
  assert(w3.founderVisible === false, "W3: FOUNDER_VISIBLE must default off");
  assert(w3.enabled === false, "W3: TARGET must default off");

  const stages = getAuditSink().map((e) => e.stage);
  for (const required of [
    "ingress",
    "authority",
    "knowledge",
    "context",
    "cognition",
    "composition",
    "integrity",
  ] as const) {
    assert(stages.includes(required), `Trace includes ${required}`);
  }

  console.log("PASS: Atlas runtime W0–W3 checks");
  console.log(
    JSON.stringify(
      {
        w1_authority: w1.state.authority?.result,
        w2_context_items: w2.state.context?.items.length,
        w3_validation: w3.state.validation?.result,
        audit_events: getAuditSink().length,
        flags: { target: w3.enabled, founderVisible: w3.founderVisible },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
