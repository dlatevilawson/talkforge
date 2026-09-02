/**
 * ACI-001 G2 — Hub receive adapter for company events.
 * Admits ops-labeled events into runIngress. Never Canonical.
 */

import { runTargetPipeline, type PipelineResult } from "../modules/hub";
import {
  normalizeCompanyEvents,
  type CompanyEvent,
} from "./company-event";

export type CompanyEventIngestResult = {
  admitted: number;
  canonical: false;
  result: PipelineResult | null;
};

export async function ingestCompanyEvents(
  events: readonly CompanyEvent[],
  options?: { throughWave?: "w1" | "w2" | "w3" }
): Promise<CompanyEventIngestResult> {
  const normalized = normalizeCompanyEvents([...events]);
  if (normalized.length === 0) {
    return { admitted: 0, canonical: false, result: null };
  }

  const result = await runTargetPipeline(
    {
      source: "ops",
      events: normalized,
      message: `Admit ${normalized.length} operational company event(s).`,
    },
    { throughWave: options?.throughWave ?? "w2" }
  );

  return {
    admitted: normalized.length,
    canonical: false,
    result,
  };
}
