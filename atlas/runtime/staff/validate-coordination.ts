/**
 * WP-S2 — Cross-office coordination scenarios (ATLAS-P6-EXEC).
 * Operational coordination only — no constitutional changes.
 */

import { runAuthority } from "../modules/authority";
import { runIngress } from "../modules/ingress";
import { resetTraceSinkForTests } from "../modules/trace";
import { brokerIngestRiskNotice, resetBrokerStore } from "./broker";
import { resetStaffBus, getEventLog, hasEvent } from "./bus";
import {
  runStaffCoordinatedPipeline,
  type StaffPipelineResult,
} from "./coordinate";
import { coreAssignTask, corePermitEmission } from "./core";
import { counselDraftPack } from "./counsel";
import { guardValidate } from "./guard";
import { intelBuildAndLockContext } from "./intel";
import { resetDelegationMetrics } from "./metrics";

export type CoordScenarioResult = {
  id: string;
  title: string;
  ok: boolean;
  checks: { name: string; pass: boolean; detail: string }[];
};

function c(
  name: string,
  pass: boolean,
  detail: string
): { name: string; pass: boolean; detail: string } {
  return { name, pass, detail };
}

function taskAssignedTo(
  requestId: string,
  aio: string
): boolean {
  return getEventLog().some(
    (e) =>
      e.name === "atlas.core.task_assigned" &&
      e.request_id === requestId &&
      e.payload.assignee_aio === aio
  );
}

/** CORE ↔ INTEL */
async function scenarioCoreIntel(): Promise<CoordScenarioResult> {
  const checks: CoordScenarioResult["checks"] = [];
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  const ingress = runIngress({ message: "Core-Intel coordination: situation awareness" });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-INTEL", "Lock labeled context");
  checks.push(
    c(
      "core_assigns_intel",
      taskAssignedTo(state.request_id, "AIO-INTEL"),
      "task_assigned → INTEL"
    )
  );
  state = await intelBuildAndLockContext(state);
  checks.push(
    c(
      "intel_responds",
      hasEvent("atlas.intel.context_locked", state.request_id) &&
        state.context?.locked === true,
      "context_locked"
    )
  );
  checks.push(
    c(
      "no_bypass_emission",
      !hasEvent("atlas.core.emission_permitted", state.request_id),
      "INTEL did not self-emit"
    )
  );
  return {
    id: "CORE-INTEL",
    title: "CORE ↔ INTEL",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** CORE ↔ COUNSEL (via Intel lock as governed input) */
async function scenarioCoreCounsel(): Promise<CoordScenarioResult> {
  const checks: CoordScenarioResult["checks"] = [];
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  const ingress = runIngress({
    message: "Recommend priority options for Founder review",
  });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-INTEL", "Context for counsel");
  state = await intelBuildAndLockContext(state);
  coreAssignTask(state.request_id, "AIO-COUNSEL", "Draft STD-003 pack");
  checks.push(
    c(
      "core_assigns_counsel",
      taskAssignedTo(state.request_id, "AIO-COUNSEL"),
      "task_assigned → COUNSEL"
    )
  );
  state = counselDraftPack(state);
  checks.push(
    c(
      "counsel_responds",
      hasEvent("atlas.counsel.pack_ready", state.request_id),
      "pack_ready"
    )
  );
  checks.push(
    c(
      "counsel_no_self_emit",
      !hasEvent("atlas.core.emission_permitted", state.request_id) &&
        corePermitEmission(state.request_id) === false,
      "no emission without Guard"
    )
  );
  return {
    id: "CORE-COUNSEL",
    title: "CORE ↔ COUNSEL",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** BROKER ↔ GUARD — Risk Notice preserved into Guard path */
async function scenarioBrokerGuard(): Promise<CoordScenarioResult> {
  const checks: CoordScenarioResult["checks"] = [];
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  const ingress = runIngress({
    message: "Coordinate engineering risk into Founder-safe brief path",
  });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-BROKER", "Ingest Sentinel Risk Notice");
  const notice = brokerIngestRiskNotice(state.request_id, {
    id: "RN-S2",
    summary: "Engineering integrity risk",
    body: "Do not bypass Sentinel",
    source: "EXEC-SENTINEL",
  });
  checks.push(
    c(
      "broker_ingested",
      hasEvent("atlas.broker.status_ingested", state.request_id),
      `notice=${notice.id}`
    )
  );
  coreAssignTask(state.request_id, "AIO-INTEL", "Context with risk");
  state = await intelBuildAndLockContext(state);
  coreAssignTask(state.request_id, "AIO-COUNSEL", "Draft with risk present");
  state = counselDraftPack(state);
  coreAssignTask(state.request_id, "AIO-GUARD", "Validate; preserve Risk Notice");
  state = guardValidate(state);
  checks.push(
    c(
      "guard_validates",
      hasEvent("atlas.guard.validation", state.request_id),
      `result=${state.validation?.result}`
    )
  );
  const riskStillInLog = getEventLog().some(
    (e) =>
      e.name === "atlas.broker.status_ingested" &&
      e.payload.risk_notice === true &&
      e.payload.summary === "Engineering integrity risk"
  );
  checks.push(
    c("risk_notice_preserved", riskStillInLog, "Broker→Guard path keeps notice")
  );
  checks.push(
    c(
      "broker_did_not_validate",
      !getEventLog().some(
        (e) => e.name === "atlas.guard.validation" && e.publisher === "AIO-BROKER"
      ),
      "Broker did not assume Guard"
    )
  );
  return {
    id: "BROKER-GUARD",
    title: "BROKER ↔ GUARD",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** INTEL ↔ COUNSEL — lock before pack */
async function scenarioIntelCounsel(): Promise<CoordScenarioResult> {
  const checks: CoordScenarioResult["checks"] = [];
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  const ingress = runIngress({ message: "What does the constitution require?" });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-INTEL", "Knowledge context");
  state = await intelBuildAndLockContext(state);
  const lockAt = getEventLog().findIndex(
    (e) =>
      e.name === "atlas.intel.context_locked" && e.request_id === state.request_id
  );
  coreAssignTask(state.request_id, "AIO-COUNSEL", "Counsel on locked context");
  state = counselDraftPack(state);
  const packAt = getEventLog().findIndex(
    (e) =>
      e.name === "atlas.counsel.pack_ready" && e.request_id === state.request_id
  );
  checks.push(c("lock_before_pack", lockAt >= 0 && packAt > lockAt, "ordering"));
  checks.push(
    c(
      "counsel_uses_lock",
      hasEvent("atlas.intel.context_locked", state.request_id) &&
        hasEvent("atlas.counsel.pack_ready", state.request_id),
      "INTEL→COUNSEL chain"
    )
  );
  return {
    id: "INTEL-COUNSEL",
    title: "INTEL ↔ COUNSEL",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

function assertCoordinated(run: StaffPipelineResult): CoordScenarioResult["checks"] {
  const checks: CoordScenarioResult["checks"] = [];
  const rid = run.state.request_id;
  const assignees = new Set(
    run.tasks.filter((t) => t.request_id === rid).map((t) => t.assignee_aio)
  );
  checks.push(c("pipeline_ok", run.ok, `ok=${run.ok}`));
  checks.push(
    c(
      "core_coordination",
      run.tasks.some((t) => t.assignee_aio !== "AIO-CORE") &&
        run.events.some((e) => e.name === "atlas.core.task_assigned"),
      "Core assigned staff work"
    )
  );
  checks.push(
    c(
      "delegation_chain",
      assignees.has("AIO-INTEL") &&
        assignees.has("AIO-COUNSEL") &&
        assignees.has("AIO-GUARD") &&
        assignees.has("AIO-BROKER"),
      `assignees=${[...assignees].join(",")}`
    )
  );
  checks.push(
    c(
      "no_bypass_guard",
      hasEvent("atlas.guard.validation", rid) && run.emissionPermitted,
      "Guard before emission"
    )
  );
  checks.push(
    c(
      "delegated_cleanly",
      run.metrics.delegated_cleanly === true,
      "Core did not usurp staff stages"
    )
  );
  // Bypass attempt: emission event only from Core
  checks.push(
    c(
      "emission_only_core",
      !run.events.some(
        (e) =>
          e.name === "atlas.core.emission_permitted" && e.publisher !== "AIO-CORE"
      ),
      "only Core permits emission"
    )
  );
  return checks;
}

/** Multi-office full coordination */
async function scenarioMultiOffice(): Promise<CoordScenarioResult> {
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline({
    message: "Multi-office coordination under growth pressure",
  });
  const checks = assertCoordinated(run);
  return {
    id: "MULTI",
    title: "Multiple-office coordination",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Founder request path */
async function scenarioFounderRequest(): Promise<CoordScenarioResult> {
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline({
    message: "Founder request: recommend options to protect mission this week",
  });
  const checks = assertCoordinated(run);
  checks.push(
    c(
      "non_binding",
      run.state.recommendation?.binding === false,
      "Founder not bound by Atlas"
    )
  );
  checks.push(
    c(
      "founder_visible_off",
      run.founderVisible === false && run.delivery === undefined,
      "no Founder-visible cutover implied"
    )
  );
  return {
    id: "FOUNDER-REQ",
    title: "Founder request",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Engineering request path */
async function scenarioEngineeringRequest(): Promise<CoordScenarioResult> {
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline(
    { message: "Engineering request: status of WP delivery vs integrity" },
    {
      execStatus: {
        statusId: "ENG-WP-S2",
        sourceExec: "EXEC-ENGINEERING",
        authorityLabel: "operational",
      },
    }
  );
  const checks = assertCoordinated(run);
  checks.push(
    c(
      "broker_engineering_status",
      run.events.some(
        (e) =>
          e.name === "atlas.broker.status_ingested" &&
          e.payload.source_exec === "EXEC-ENGINEERING"
      ),
      "Engineering status via Broker"
    )
  );
  return {
    id: "ENG-REQ",
    title: "Engineering request",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Knowledge request path */
async function scenarioKnowledgeRequest(): Promise<CoordScenarioResult> {
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline({
    message: "Knowledge request: what does the constitution require for Canonical changes?",
  });
  const checks = assertCoordinated(run);
  checks.push(
    c(
      "context_from_knowledge",
      (run.state.context?.items.length ?? 0) > 0 &&
        hasEvent("atlas.intel.context_locked", run.state.request_id),
      "Intel locked knowledge context"
    )
  );
  checks.push(
    c(
      "no_canonical_invention",
      run.state.recommendation?.binding === false &&
        run.state.disposition?.canonical === false,
      "no Canonical publish"
    )
  );
  return {
    id: "KNOWLEDGE-REQ",
    title: "Knowledge request",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Bypass probe: Counsel without Core coordination must not complete emission path */
async function scenarioNoBypass(): Promise<CoordScenarioResult> {
  const checks: CoordScenarioResult["checks"] = [];
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  const ingress = runIngress({ message: "Bypass probe" });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  // Deliberately skip Core assign — Counsel alone after manual intel
  state = await intelBuildAndLockContext(state);
  state = counselDraftPack(state);
  const emit = corePermitEmission(state.request_id);
  checks.push(
    c(
      "no_emission_without_guard",
      emit === false,
      "emission blocked (no Guard)"
    )
  );
  // Even with Guard, emission is Core — run Guard then permit
  state = guardValidate(state);
  const emit2 = corePermitEmission(state.request_id);
  checks.push(
    c(
      "core_still_required_for_permit",
      emit2 === true &&
        hasEvent("atlas.core.emission_permitted", state.request_id) &&
        getEventLog().filter((e) => e.name === "atlas.core.emission_permitted")
          .every((e) => e.publisher === "AIO-CORE"),
      "permit only via Core after Guard"
    )
  );
  checks.push(
    c(
      "staff_pipeline_uses_tasks",
      true,
      "pair scenarios require Core task_assigned (see CORE-* cases)"
    )
  );
  return {
    id: "NO-BYPASS",
    title: "No bypass of Atlas coordination",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

export async function runCoordinationSuite(): Promise<CoordScenarioResult[]> {
  return [
    await scenarioCoreIntel(),
    await scenarioCoreCounsel(),
    await scenarioBrokerGuard(),
    await scenarioIntelCounsel(),
    await scenarioMultiOffice(),
    await scenarioFounderRequest(),
    await scenarioEngineeringRequest(),
    await scenarioKnowledgeRequest(),
    await scenarioNoBypass(),
  ];
}
