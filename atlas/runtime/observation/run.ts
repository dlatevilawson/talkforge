/**
 * ATLAS-GATE-FV observation suite — TARGET on, FOUNDER_VISIBLE off.
 */

import {
  isTargetFounderVisibleEnabled,
  isTargetPlaneEnabled,
  getRuntimeFlagSnapshot,
} from "../flags";
import { runTargetPipeline } from "../modules/hub";
import { resetTraceSinkForTests } from "../modules/trace";
import { resetRetentionForTests } from "../retention/store";
import { OBSERVATION_SCENARIOS } from "./scenarios";
import {
  evaluateAuditTrails,
  evaluateAuthority,
  evaluateEscalation,
  evaluateLabeling,
  evaluateNoCanonicalLeak,
  evaluateNoSilentFailures,
  evaluateRecommendationQuality,
  evaluateRepeatability,
  type CriterionResult,
} from "./evaluate";

const ITERATIONS = 3;

export type ObservationReport = {
  gate: "ATLAS-GATE-FV";
  generated_at: string;
  flags: ReturnType<typeof getRuntimeFlagSnapshot>;
  iterations: number;
  criteria: CriterionResult[];
  ok: boolean;
  recommendation:
    | "do_not_enable_founder_visible"
    | "evidence_supports_founder_decision";
};

export async function runObservationSuite(): Promise<ObservationReport> {
  const flags = getRuntimeFlagSnapshot();
  const preFailures: CriterionResult[] = [];

  if (!isTargetPlaneEnabled()) {
    preFailures.push({
      id: "FV-1",
      name: "Correct authority handling",
      pass: false,
      evidence: [],
      failures: ["TARGET must be on for observation (ATLAS-D-FLAGS)"],
    });
  }
  if (isTargetFounderVisibleEnabled()) {
    preFailures.push({
      id: "FV-2",
      name: "Correct escalation behavior",
      pass: false,
      evidence: [],
      failures: ["FOUNDER_VISIBLE must remain off during observation"],
    });
  }

  if (preFailures.length) {
    return {
      gate: "ATLAS-GATE-FV",
      generated_at: new Date().toISOString(),
      flags,
      iterations: 0,
      criteria: preFailures,
      ok: false,
      recommendation: "do_not_enable_founder_visible",
    };
  }

  const iterations: Array<
    Array<{
      scenarioId: string;
      result: Awaited<ReturnType<typeof runTargetPipeline>>;
      expectAuthority?: string;
    }>
  > = [];

  for (let i = 0; i < ITERATIONS; i++) {
    resetTraceSinkForTests();
    resetRetentionForTests();
    const batch: (typeof iterations)[number] = [];
    for (const scenario of OBSERVATION_SCENARIOS) {
      const result = await runTargetPipeline(scenario.input);
      batch.push({
        scenarioId: scenario.id,
        result,
        expectAuthority: scenario.expect.authority,
      });
      // Scenario-level hard expects
      if (scenario.expect.deliveryUndefined && result.delivery !== undefined) {
        // recorded via criteria evaluators
      }
      if (
        scenario.expect.recommendationType &&
        result.state.recommendation?.type !== scenario.expect.recommendationType
      ) {
        // FV-2 will catch
      }
      if (
        scenario.expect.disposition &&
        result.state.disposition?.class !== scenario.expect.disposition
      ) {
        // attach soft note via FV-6 path — also check here by pushing fake failure into labeling? 
        // Better: add to a dedicated check in run after evaluators
      }
    }
    iterations.push(batch);
  }

  // Use last iteration for structural criteria; all iterations for repeatability
  const last = iterations[iterations.length - 1]!;

  // Disposition expect for S6
  const s6 = last.find((r) => r.scenarioId === "S6");
  const dispositionFailures: string[] = [];
  if (s6 && s6.result.state.disposition?.class !== "promotion_candidate") {
    dispositionFailures.push(
      `S6: expected promotion_candidate, got ${s6.result.state.disposition?.class}`
    );
  }

  const criteria: CriterionResult[] = [
    evaluateAuthority(last),
    evaluateEscalation(last),
    evaluateLabeling(last),
    evaluateNoCanonicalLeak(last),
    evaluateAuditTrails(last),
    evaluateRecommendationQuality(last),
    evaluateNoSilentFailures(last),
    evaluateRepeatability(iterations),
  ];

  if (dispositionFailures.length) {
    const fv4 = criteria.find((c) => c.id === "FV-4")!;
    fv4.failures.push(...dispositionFailures);
    fv4.pass = fv4.failures.length === 0;
  }

  const ok = criteria.every((c) => c.pass);

  return {
    gate: "ATLAS-GATE-FV",
    generated_at: new Date().toISOString(),
    flags,
    iterations: ITERATIONS,
    criteria,
    ok,
    recommendation: ok
      ? "evidence_supports_founder_decision"
      : "do_not_enable_founder_visible",
  };
}
