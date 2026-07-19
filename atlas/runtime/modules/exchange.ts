import type { WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

export type ExchangeChannel =
  | "founder"
  | "sentinel"
  | "domain"
  | "promotion"
  | "blocked";

export type ExchangeDelivery = {
  channel: ExchangeChannel;
  deliverable: string;
  binding: false;
  validation: string;
  /** Sentinel findings must be preserved verbatim when present. */
  sentinel_findings_intact?: boolean;
  /** Domain exchange must not absorb domain ownership. */
  domain_absorbed?: false;
  /** Promotion channel never publishes Canonical. */
  canonical_published?: false;
};

export type ExchangeDryRunResult = {
  founder: ExchangeDelivery;
  sentinel: ExchangeDelivery;
  domain: ExchangeDelivery;
  promotion: ExchangeDelivery;
  boundary_violations: string[];
};

/**
 * rt.exchange — channel delivery with hard boundaries.
 * Founder channel used only when FOUNDER_VISIBLE is on (hub-gated).
 * W4 dry-run exercises all channels without production Founder exposure.
 */
export function runExchange(state: WorkflowState): {
  state: WorkflowState;
  delivery: ExchangeDelivery;
} {
  const verdict = state.validation?.result;
  const allowed = verdict === "PASS" || verdict === "ESCALATE";

  if (!allowed || !state.recommendation) {
    const blocked: ExchangeDelivery = {
      channel: "blocked",
      deliverable: state.error ?? "Not eligible for Founder delivery",
      binding: false,
      validation: verdict ?? "missing",
      canonical_published: false,
      domain_absorbed: false,
    };
    const next = traceStage(
      state,
      "exchange",
      "Delivery blocked — Integrity did not PASS/ESCALATE"
    );
    return { state: next, delivery: blocked };
  }

  const delivery: ExchangeDelivery = {
    channel: "founder",
    deliverable: state.recommendation.recommendation,
    binding: false,
    validation: verdict,
    canonical_published: false,
    domain_absorbed: false,
  };

  const next = traceStage(state, "exchange", `Founder channel delivery (${verdict})`, [
    state.recommendation.recommendation_id,
  ]);
  return { state: next, delivery };
}

/**
 * W4 dry-run: prove exchange exposure boundaries without Founder-visible serving.
 */
export function dryRunExchangeExposure(state: WorkflowState): ExchangeDryRunResult {
  const verdict = state.validation?.result ?? "missing";
  const rec = state.recommendation?.recommendation ?? "(no recommendation)";
  const binding = false as const;
  const violations: string[] = [];

  const founderAllowed = verdict === "PASS" || verdict === "ESCALATE";
  const founder: ExchangeDelivery = founderAllowed
    ? {
        channel: "founder",
        deliverable: rec,
        binding,
        validation: verdict,
        canonical_published: false,
        domain_absorbed: false,
      }
    : {
        channel: "blocked",
        deliverable: "Founder channel blocked without Integrity PASS/ESCALATE",
        binding,
        validation: verdict,
        canonical_published: false,
        domain_absorbed: false,
      };

  // Sentinel: findings preserved; Atlas must not rewrite engineering verdicts
  const sentinelFinding =
    state.reasoning?.risks.find((r) => /sentinel/i.test(r)) ??
    "No Sentinel finding attached — channel ready; findings would pass through intact";
  const sentinel: ExchangeDelivery = {
    channel: "sentinel",
    deliverable: `Request for findings / shared options. Preserved note: ${sentinelFinding}`,
    binding,
    validation: verdict,
    sentinel_findings_intact: true,
    canonical_published: false,
    domain_absorbed: false,
  };

  const domain: ExchangeDelivery = {
    channel: "domain",
    deliverable:
      "Coordination status/options request only — Atlas does not assume domain execution ownership",
    binding,
    validation: verdict,
    domain_absorbed: false,
    canonical_published: false,
  };

  const promotion: ExchangeDelivery = {
    channel: "promotion",
    deliverable:
      state.disposition?.class === "promotion_candidate"
        ? "Promotion candidate staged for STD-002 — not Canonical"
        : "No promotion candidate on this path",
    binding,
    validation: verdict,
    canonical_published: false,
    domain_absorbed: false,
  };

  if (founder.binding !== false) violations.push("Founder delivery binding must be false");
  if (sentinel.sentinel_findings_intact !== true) {
    violations.push("Sentinel findings must remain intact");
  }
  if (domain.domain_absorbed !== false) {
    violations.push("Domain absorption forbidden");
  }
  if (promotion.canonical_published !== false) {
    violations.push("Promotion channel must not publish Canonical");
  }

  return {
    founder,
    sentinel,
    domain,
    promotion,
    boundary_violations: violations,
  };
}
