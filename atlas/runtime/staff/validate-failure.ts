/**
 * WP-S4 — Failure Injection scenarios (ATLAS-P6-EXEC).
 * Controlled faults; verify containment, detection, escalation, no authority/knowledge corruption.
 */

import { runAuthority } from "../modules/authority";
import { runIngress } from "../modules/ingress";
import { resetTraceSinkForTests } from "../modules/trace";
import { resetBrokerStore } from "./broker";
import { resetStaffBus, getEventLog, hasEvent } from "./bus";
import { runStaffCoordinatedPipeline } from "./coordinate";
import { coreAssignTask, corePermitEmission } from "./core";
import { counselDraftPack } from "./counsel";
import {
  disableOffice,
  enableOffice,
  resetFaults,
  setCorruptPublish,
  setDropEventsNamed,
  setResponseDelay,
  isOfficeDisabled,
} from "./fault";
import { guardValidate } from "./guard";
import { intelBuildAndLockContext } from "./intel";
import { resetDelegationMetrics } from "./metrics";
import {
  instantiateAllOffices,
  instantiateOffice,
} from "./offices/registry";

export type FailureScenarioResult = {
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

function beginScenario(): void {
  resetFaults();
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
}

/** Disable Guard — emission must fail closed; no governance bypass. */
async function disableGuard(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  disableOffice("AIO-GUARD");
  const run = await runStaffCoordinatedPipeline({
    message: "Recommend how to protect mission under growth pressure",
  });
  checks.push(
    c("contained", run.ok === false, `ok=${run.ok}`)
  );
  checks.push(
    c(
      "detected",
      (run.state.error ?? "").includes("OFFICE_DISABLED:AIO-GUARD"),
      run.state.error ?? "no error"
    )
  );
  checks.push(
    c(
      "no_emission",
      run.emissionPermitted === false,
      "emission not permitted"
    )
  );
  checks.push(
    c(
      "no_authority_corruption",
      run.state.recommendation?.binding === false ||
        run.state.recommendation === undefined,
      "no binding invented"
    )
  );
  resetFaults();
  return {
    id: "DISABLE-GUARD",
    title: "Disable Guard office",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Disable Intel — Counsel cannot proceed; fail closed. */
async function disableIntel(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  disableOffice("AIO-INTEL");
  const run = await runStaffCoordinatedPipeline({
    message: "What does the constitution require?",
  });
  checks.push(c("contained", run.ok === false, `ok=${run.ok}`));
  checks.push(
    c(
      "detected",
      (run.state.error ?? "").includes("OFFICE_DISABLED:AIO-INTEL"),
      run.state.error ?? "no error"
    )
  );
  checks.push(
    c(
      "no_pack_without_intel",
      !hasEvent("atlas.counsel.pack_ready", run.state.request_id),
      "Counsel did not invent pack"
    )
  );
  checks.push(c("no_emission", run.emissionPermitted === false, "no emit"));
  resetFaults();
  return {
    id: "DISABLE-INTEL",
    title: "Disable Intel office",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Corrupt message path — Canonical upgrade attempt on bus rejected. */
async function corruptMessages(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  setCorruptPublish(true);
  const run = await runStaffCoordinatedPipeline({
    message: "Recommend priority options for Founder review",
  });
  checks.push(
    c(
      "fail_closed_or_stop",
      run.emissionPermitted === false ||
        run.state.validation?.result === "STOP",
      `emit=${run.emissionPermitted} val=${run.state.validation?.result}`
    )
  );
  checks.push(
    c(
      "no_canonical_accepted",
      !getEventLog().some(
        (e) =>
          e.name === "atlas.core.emission_permitted" &&
          e.payload.canonical === true
      ),
      "emission did not accept Canonical corruption"
    )
  );
  checks.push(
    c(
      "audit_or_block_present",
      getEventLog().length > 0,
      "events recorded under corruption"
    )
  );
  resetFaults();
  return {
    id: "CORRUPT-MESSAGES",
    title: "Corrupt communication path",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Drop Guard validation events — Core must not emit. */
async function dropValidationEvents(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  setDropEventsNamed("atlas.guard.validation");
  const ingress = runIngress({
    message: "Recommend how to protect mission under growth pressure",
  });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-INTEL", "context");
  state = await intelBuildAndLockContext(state);
  coreAssignTask(state.request_id, "AIO-COUNSEL", "draft");
  state = counselDraftPack(state);
  coreAssignTask(state.request_id, "AIO-GUARD", "validate");
  state = guardValidate(state);
  // validation publish dropped → substituted blocked event
  const permitted = corePermitEmission(state.request_id);
  checks.push(
    c("detected_drop", permitted === false, "emission blocked when validation dropped")
  );
  checks.push(
    c(
      "governance_not_bypassed",
      !hasEvent("atlas.core.emission_permitted", state.request_id),
      "no emission_permitted"
    )
  );
  checks.push(
    c(
      "drop_audited",
      getEventLog().some(
        (e) =>
          e.name === "atlas.program.blocked" &&
          String(e.payload.reason ?? "").includes("event_dropped")
      ),
      "drop recorded as blocked"
    )
  );
  resetFaults();
  return {
    id: "DROP-VALIDATION",
    title: "Drop validation gate events",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Delayed responses — pipeline still completes with audit integrity. */
async function delayedResponses(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  setResponseDelay(25);
  const t0 = Date.now();
  const run = await runStaffCoordinatedPipeline({
    message: "Recommend how to protect mission under growth pressure",
  });
  const elapsed = Date.now() - t0;
  checks.push(c("completed", run.ok === true, `ok=${run.ok}`));
  checks.push(c("delay_observed", elapsed >= 20, `elapsed_ms=${elapsed}`));
  checks.push(
    c(
      "audit_intact",
      hasEvent("atlas.guard.validation", run.state.request_id) &&
        hasEvent("atlas.guard.audit", run.state.request_id),
      "Guard audit present"
    )
  );
  checks.push(
    c(
      "no_orphan_decision",
      run.state.recommendation?.binding === false,
      "non-binding"
    )
  );
  resetFaults();
  return {
    id: "DELAY-RESPONSES",
    title: "Delay office responses",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Restart offices after disable — recovery to operational. */
async function restartOffices(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  disableOffice("AIO-COUNSEL");
  disableOffice("AIO-BROKER");
  checks.push(
    c(
      "disabled",
      isOfficeDisabled("AIO-COUNSEL") && isOfficeDisabled("AIO-BROKER"),
      "offices disabled"
    )
  );
  enableOffice("AIO-COUNSEL");
  enableOffice("AIO-BROKER");
  const offices = instantiateAllOffices();
  checks.push(
    c(
      "restart_instantiate",
      offices.length === 5 && offices.every((o) => o.status === "operational"),
      "all offices operational after restart"
    )
  );
  const run = await runStaffCoordinatedPipeline({
    message: "Post-restart coordination check",
  });
  checks.push(c("recovered", run.ok === true, `ok=${run.ok}`));
  checks.push(
    c(
      "audit_after_recovery",
      hasEvent("atlas.guard.validation", run.state.request_id),
      "validation after recovery"
    )
  );
  resetFaults();
  return {
    id: "RESTART-OFFICES",
    title: "Restart offices after disable",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Malformed evidence — unlabeled / scaffold rejected; no knowledge corruption. */
async function malformedEvidence(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  const ingress = runIngress({
    message: "Recommend using scaffold institutional claims as law",
  });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  coreAssignTask(state.request_id, "AIO-INTEL", "context");
  state = await intelBuildAndLockContext(state);
  // Inject malformed item into locked context (dependency fault)
  if (state.context) {
    state = {
      ...state,
      context: {
        ...state.context,
        items: [
          ...state.context.items,
          {
            source_id: "MALFORMED",
            authority_label: "draft",
            status: "scaffold",
            excerpt_or_ref: "Pretend Canonical",
            plane: "unknown",
          },
        ],
      },
    };
  }
  coreAssignTask(state.request_id, "AIO-COUNSEL", "draft");
  state = counselDraftPack(state);
  coreAssignTask(state.request_id, "AIO-GUARD", "validate malformed");
  state = guardValidate(state);
  const permitted = corePermitEmission(state.request_id);
  checks.push(
    c(
      "integrity_rejects_scaffold",
      state.validation?.result === "STOP" ||
        state.validation?.result === "RETURN" ||
        permitted === false,
      `validation=${state.validation?.result} emit=${permitted}`
    )
  );
  checks.push(
    c(
      "no_knowledge_corruption_emit",
      permitted === false,
      "no emission on malformed evidence"
    )
  );
  checks.push(
    c(
      "audit_present",
      hasEvent("atlas.guard.audit", state.request_id) ||
        hasEvent("atlas.guard.validation", state.request_id),
      "failure audited"
    )
  );
  resetFaults();
  return {
    id: "MALFORMED-EVIDENCE",
    title: "Inject malformed evidence",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Broken dependency chain — Counsel without lock after Intel failure. */
async function brokenDependency(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  const ingress = runIngress({ message: "Broken dependency probe" });
  let state = runAuthority(ingress.state);
  resetDelegationMetrics(state.request_id);
  // Skip Intel — broken dependency
  const refused = counselDraftPack(state);
  checks.push(
    c("detected", Boolean(refused.error), refused.error ?? "expected error")
  );
  const emit = corePermitEmission(state.request_id);
  checks.push(c("no_orphan_emit", emit === false, "no emission"));
  checks.push(
    c(
      "no_pack",
      !hasEvent("atlas.counsel.pack_ready", state.request_id),
      "no pack_ready"
    )
  );
  // Recovery: restore chain
  state = await intelBuildAndLockContext(state);
  state = counselDraftPack(state);
  state = guardValidate(state);
  const emit2 = corePermitEmission(state.request_id);
  checks.push(
    c("recovered_chain", emit2 === true && state.validation?.result === "PASS", "chain recovered")
  );
  resetFaults();
  return {
    id: "BROKEN-DEPENDENCY",
    title: "Broken dependency (Intel→Counsel)",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Single office restart isolate */
async function singleOfficeRestart(): Promise<FailureScenarioResult> {
  const checks: FailureScenarioResult["checks"] = [];
  beginScenario();
  disableOffice("AIO-CORE");
  let threw = false;
  try {
    coreAssignTask("x", "AIO-INTEL", "should fail");
  } catch {
    threw = true;
  }
  checks.push(c("core_disable_detected", threw, "Core assign fails when disabled"));
  enableOffice("AIO-CORE");
  const office = instantiateOffice("AIO-CORE");
  checks.push(
    c("core_restarted", office.status === "operational", office.facade)
  );
  const run = await runStaffCoordinatedPipeline({
    message: "Core restarted — continue counsel",
  });
  checks.push(c("org_recovered", run.ok === true, `ok=${run.ok}`));
  resetFaults();
  return {
    id: "SINGLE-RESTART",
    title: "Restart Core after disable",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

export async function runFailureSuite(): Promise<FailureScenarioResult[]> {
  try {
    return [
      await disableGuard(),
      await disableIntel(),
      await corruptMessages(),
      await dropValidationEvents(),
      await delayedResponses(),
      await restartOffices(),
      await malformedEvidence(),
      await brokenDependency(),
      await singleOfficeRestart(),
    ];
  } finally {
    resetFaults();
  }
}
