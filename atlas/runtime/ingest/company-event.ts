/**
 * ACI-001 G2 — company events for Hub receive.
 * Operational only. Never Canonical. No new AIO office. No identity writes.
 */

import type { AwarenessSignal } from "../../engine/ops-types";
import type { CompanyEvent } from "../types/envelopes";
import type { StaffEvent } from "../staff/events";

export type { CompanyEvent };

function asOperational(event: Omit<CompanyEvent, "canonical">): CompanyEvent {
  return { ...event, canonical: false };
}

export function normalizeCompanyEvents(
  raw: readonly CompanyEvent[] | undefined
): CompanyEvent[] {
  if (!raw) return [];
  const out: CompanyEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (item.family !== "awareness" && item.family !== "staff") continue;
    if (typeof item.kind !== "string" || !item.kind.trim()) continue;
    if (typeof item.fact !== "string" || !item.fact.trim()) continue;
    out.push(
      asOperational({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : item.kind,
        family: item.family,
        kind: item.kind.trim(),
        fact: item.fact.trim().slice(0, 400),
        occurred_at:
          typeof item.occurred_at === "string" && item.occurred_at
            ? item.occurred_at
            : new Date().toISOString(),
        provenance: {
          origin:
            item.family === "awareness" ? "awareness-steward" : "staff-bus",
          refs: Array.isArray(item.provenance?.refs)
            ? item.provenance.refs.filter((ref) => typeof ref === "string")
            : [],
        },
      })
    );
  }
  return out;
}

export function companyEventsFromAwarenessSignals(
  signals: readonly AwarenessSignal[],
  now = new Date().toISOString()
): CompanyEvent[] {
  return signals.map((signal) =>
    asOperational({
      id: `awareness:${signal.id}`,
      family: "awareness",
      kind: signal.id,
      fact: signal.fact,
      occurred_at: now,
      provenance: {
        origin: "awareness-steward",
        refs: [signal.domain, signal.severity, signal.owner],
      },
    })
  );
}

export function companyEventsFromStaffEvents(
  events: readonly StaffEvent[]
): CompanyEvent[] {
  return events.flatMap((event) => {
    if (event.payload?.canonical === true) return [];
    if (event.payload?.corrupted === true) return [];
    const fact = staffFact(event);
    if (!fact) return [];
    return [
      asOperational({
        id: `staff:${event.name}:${event.request_id}`,
        family: "staff",
        kind: event.name,
        fact,
        occurred_at: event.at,
        provenance: {
          origin: "staff-bus",
          refs: [event.publisher, event.request_id],
        },
      }),
    ];
  });
}

function staffFact(event: StaffEvent): string {
  const reason =
    typeof event.payload?.reason === "string" ? event.payload.reason.trim() : "";
  const status =
    typeof event.payload?.status === "string" ? event.payload.status.trim() : "";
  const detail = reason || status;
  const line = detail
    ? `${event.name} from ${event.publisher}: ${detail}`
    : `${event.name} from ${event.publisher}`;
  return line.slice(0, 400);
}
