import { randomUUID } from "crypto";
import type { MemoryClass, MemoryDisposition, WorkflowState } from "../types/envelopes";

/**
 * Operational retention sinks for W4 readiness.
 * In-process stores simulate production retention under real classification rules.
 * Never writes Canonical knowledge. Promo staging is NOT REG-PROMO-Q publication.
 */

export type RetentionRecord = {
  record_id: string;
  request_id: string;
  class: MemoryClass;
  summary: string;
  refs: string[];
  canonical: false;
  stored_at: string;
  sink: "ephemeral" | "ops" | "promo_staging" | "discard";
};

export type PromoStagingItem = {
  staging_id: string;
  request_id: string;
  stage: "Observation";
  summary: string;
  canonical: false;
  auto_published: false;
  created_at: string;
  notes: string[];
};

const ephemeral: RetentionRecord[] = [];
const ops: RetentionRecord[] = [];
const discarded: RetentionRecord[] = [];
const promoStaging: PromoStagingItem[] = [];

export function resetRetentionForTests(): void {
  ephemeral.length = 0;
  ops.length = 0;
  discarded.length = 0;
  promoStaging.length = 0;
}

export function getRetentionSnapshot() {
  return {
    ephemeral: [...ephemeral],
    ops: [...ops],
    discarded: [...discarded],
    promoStaging: [...promoStaging],
  };
}

function sinkFor(classValue: MemoryClass): RetentionRecord["sink"] {
  switch (classValue) {
    case "temporary":
      return "ephemeral";
    case "operational":
      return "ops";
    case "promotion_candidate":
      return "promo_staging";
    case "discarded":
      return "discard";
  }
}

/**
 * Persist a classified disposition into the appropriate non-Canonical sink.
 */
export function persistDisposition(disposition: MemoryDisposition): {
  record: RetentionRecord;
  promo?: PromoStagingItem;
} {
  if (disposition.canonical !== false) {
    throw new Error("Retention refused: disposition.canonical must be false");
  }

  const sink = sinkFor(disposition.class);
  const record: RetentionRecord = {
    record_id: randomUUID(),
    request_id: disposition.request_id,
    class: disposition.class,
    summary: disposition.summary,
    refs: disposition.refs,
    canonical: false,
    stored_at: new Date().toISOString(),
    sink,
  };

  if (sink === "ephemeral") ephemeral.push(record);
  else if (sink === "ops") ops.push(record);
  else if (sink === "discard") discarded.push(record);

  let promo: PromoStagingItem | undefined;
  if (disposition.class === "promotion_candidate") {
    promo = {
      staging_id: randomUUID(),
      request_id: disposition.request_id,
      stage: "Observation",
      summary: disposition.summary,
      canonical: false,
      auto_published: false,
      created_at: new Date().toISOString(),
      notes: [
        "Staging only — not REG-PROMO-Q Canonical publication",
        "STD-002 stages required before institutional approval",
      ],
    };
    if (promo.canonical !== false || promo.auto_published !== false) {
      throw new Error("Promo staging must not auto-publish Canonical");
    }
    promoStaging.push(promo);
    // Also keep an ops crumb pointing at staging
    ops.push({
      ...record,
      record_id: randomUUID(),
      sink: "promo_staging",
      summary: `Promo staging ${promo.staging_id}`,
    });
  }

  return { record, promo };
}

/**
 * Classify for retention under operational conditions.
 * Promotion candidates only when explicitly requested via intent marker or escalation learning.
 */
export function classifyForRetention(state: WorkflowState): MemoryDisposition {
  const intent = state.request?.intent ?? "";
  const wantsPromo =
    /\b(promote|promotion candidate|institutional lesson)\b/i.test(intent) &&
    state.validation?.result === "PASS";

  let classValue: MemoryClass;
  if (state.validation?.result === "STOP") {
    classValue = "discarded";
  } else if (wantsPromo) {
    classValue = "promotion_candidate";
  } else if (state.validation?.result === "PASS") {
    classValue = "temporary";
  } else {
    classValue = "operational";
  }

  return {
    request_id: state.request_id,
    class: classValue,
    summary: `W4 retention class=${classValue}; canonical=false`,
    refs: state.audit.map((a) => a.event_id),
    canonical: false,
  };
}
