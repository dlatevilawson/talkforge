/**
 * W4 operational readiness runner — evidence only; never enables Founder visibility.
 */

import { dryRunExchangeExposure } from "../modules/exchange";
import { runTargetPipeline } from "../modules/hub";
import { resetTraceSinkForTests, getAuditSink } from "../modules/trace";
import {
  getRetentionSnapshot,
  resetRetentionForTests,
} from "../retention/store";
import { isTargetFounderVisibleEnabled, isTargetPlaneEnabled } from "../flags";
import { evaluateCutoverReadiness } from "./cutover";

export type W4EvidencePack = {
  decision: "ATLAS-D-W4";
  flags: { target: boolean; founderVisible: boolean };
  retention: ReturnType<typeof getRetentionSnapshot>;
  exchange: ReturnType<typeof dryRunExchangeExposure>;
  cutover: ReturnType<typeof evaluateCutoverReadiness>;
  pipeline: {
    request_id: string;
    validation: string | null;
    disposition_class: string | null;
  };
  promo_pipeline: {
    request_id: string;
    disposition_class: string | null;
    staging_count: number;
  };
  ok: boolean;
  failures: string[];
};

export async function collectW4Evidence(): Promise<W4EvidencePack> {
  const failures: string[] = [];

  // ATLAS-D-FLAGS: TARGET authorized on; FOUNDER_VISIBLE stays off (observation window).
  if (isTargetFounderVisibleEnabled()) {
    failures.push("FOUNDER_VISIBLE must remain off (ATLAS-D-FLAGS observation window)");
  }
  if (!isTargetPlaneEnabled()) {
    failures.push(
      "TARGET must be enabled as active internal implementation (ATLAS-D-FLAGS)"
    );
  }

  resetTraceSinkForTests();
  resetRetentionForTests();

  const normal = await runTargetPipeline({
    message: "Recommend how to protect mission under growth pressure",
  });
  if (normal.delivery !== undefined) {
    failures.push("Founder delivery must be undefined while FOUNDER_VISIBLE off");
  }
  if (normal.state.validation?.result !== "PASS") {
    failures.push(`Expected Integrity PASS, got ${normal.state.validation?.result}`);
  }
  if (normal.state.disposition?.canonical !== false) {
    failures.push("Disposition must be non-Canonical");
  }

  const exchange = dryRunExchangeExposure(normal.state);
  if (exchange.boundary_violations.length) {
    failures.push(...exchange.boundary_violations.map((v) => `exchange: ${v}`));
  }

  resetTraceSinkForTests();
  // Keep retention across promo run to prove staging accumulate
  const promo = await runTargetPipeline({
    message:
      "Capture an institutional lesson as a promotion candidate for STD-002 review",
  });
  if (promo.state.disposition?.class !== "promotion_candidate") {
    failures.push(
      `Expected promotion_candidate, got ${promo.state.disposition?.class}`
    );
  }

  const retention = getRetentionSnapshot();
  if (!retention.promoStaging.length) {
    failures.push("Promo staging empty after promotion-candidate path");
  }
  if (retention.promoStaging.some((p) => p.canonical !== false || p.auto_published !== false)) {
    failures.push("Promo staging attempted Canonical auto-publish");
  }
  const allRecords = [
    ...retention.ephemeral,
    ...retention.ops,
    ...retention.discarded,
  ];
  if (allRecords.some((r) => r.canonical !== false)) {
    failures.push("Retention record marked canonical");
  }

  const cutover = evaluateCutoverReadiness();
  if (cutover.founder_visible_enabled) {
    failures.push("Cutover report: founder visible enabled");
  }
  if (cutover.blockers.length) {
    failures.push(...cutover.blockers.map((b) => `cutover: ${b}`));
  }

  // Audit reconstructability
  const stages = getAuditSink().map((e) => e.stage);
  if (!stages.includes("memory")) {
    failures.push("Trace missing memory stage on promo path");
  }

  return {
    decision: "ATLAS-D-W4",
    flags: {
      target: isTargetPlaneEnabled(),
      founderVisible: isTargetFounderVisibleEnabled(),
    },
    retention,
    exchange,
    cutover,
    pipeline: {
      request_id: normal.state.request_id,
      validation: normal.state.validation?.result ?? null,
      disposition_class: normal.state.disposition?.class ?? null,
    },
    promo_pipeline: {
      request_id: promo.state.request_id,
      disposition_class: promo.state.disposition?.class ?? null,
      staging_count: retention.promoStaging.length,
    },
    ok: failures.length === 0,
    failures,
  };
}
