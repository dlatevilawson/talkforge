import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { collectAwarenessSignals } from "../../engine/awareness-steward.ts";
import { EVENT_CATALOG } from "../staff/events.ts";
import {
  companyEventsFromAwarenessSignals,
  companyEventsFromStaffEvents,
  normalizeCompanyEvents,
} from "./company-event.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function balancedOps() {
  return {
    productHealth: {
      sessionsCompleted: 4,
      sessionsTotal: 4,
      averageScore: 70,
      reflectionsSaved: 1,
      lastSessionAt: "2026-08-21T00:00:00.000Z",
      lastScenarioTitle: "Practice",
      uniqueUsers: 1,
      tone: "good",
      summary: "Practice loop is healthy.",
    },
    database: {
      configured: true,
      reachable: true,
      backend: "supabase",
      profileCount: 3,
      message: "Supabase reachable.",
      tone: "good",
    },
    github: {
      available: true,
      repo: "dlatevilawson/talkforge",
      openPullRequests: 1,
      message: "GitHub live.",
      tone: "good",
      activity: [],
    },
    aiUsage: {
      openaiConfigured: true,
      forgeTurnsRecent: 10,
      sessionsWithCoaching: 4,
      averageCoachScore: 70,
      estimatedCostUsd: 1,
      currency: "USD",
      message: "OpenAI configured.",
      tone: "good",
    },
    openBugs: [],
    nextAction: {
      title: "Continue the current slice",
      reason: "Work is unblocked.",
      href: "/founder/atlas",
      cta: "Open Atlas",
      urgency: "low",
    },
    deploymentStatus: "healthy",
  };
}

describe("ACI-001 G2 unified event ingestion", () => {
  it("maps awareness signals to Operational company events, never Canonical", () => {
    const signals = collectAwarenessSignals({
      ...balancedOps(),
      database: {
        configured: true,
        reachable: false,
        backend: "supabase",
        profileCount: null,
        message: "Supabase unreachable.",
        tone: "bad",
      },
    });
    const events = companyEventsFromAwarenessSignals(signals);
    assert.ok(events.length >= 1);
    assert.equal(events.every((event) => event.canonical === false), true);
    assert.equal(events[0].family, "awareness");
    assert.equal(events[0].provenance.origin, "awareness-steward");
    assert.match(events[0].fact, /Supabase unreachable/);
    assert.equal(normalizeCompanyEvents(events).length, events.length);
  });

  it("maps staff-bus events onto the same envelope without a new AIO office", () => {
    assert.equal(EVENT_CATALOG.length, 13);
    const events = companyEventsFromStaffEvents([
      {
        name: "atlas.intel.health_signal",
        at: "2026-08-26T00:00:00.000Z",
        request_id: "req_staff",
        publisher: "AIO-INTEL",
        payload: { reason: "Database heartbeat missed." },
      },
    ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].canonical, false);
    assert.equal(events[0].family, "staff");
    assert.equal(events[0].provenance.origin, "staff-bus");
    assert.match(events[0].fact, /Database heartbeat missed/);
  });

  it("refuses to ingest a staff event that claims Canonical", () => {
    const events = companyEventsFromStaffEvents([
      {
        name: "atlas.guard.audit",
        at: "2026-08-26T00:00:00.000Z",
        request_id: "req_corrupt",
        publisher: "AIO-GUARD",
        payload: { canonical: true, corrupted: true, reason: "forge Constitution" },
      },
    ]);
    assert.equal(events.length, 0);
    assert.equal(normalizeCompanyEvents(events).length, 0);
  });

  it("does not write Executive Memory, Identity, or lift loader/visibility", () => {
    const ingest = readFileSync(join(root, "atlas/runtime/ingest/receive.ts"), "utf8");
    const company = readFileSync(
      join(root, "atlas/runtime/ingest/company-event.ts"),
      "utf8"
    );
    const ingress = readFileSync(
      join(root, "atlas/runtime/modules/ingress.ts"),
      "utf8"
    );
    const loader = readFileSync(join(root, "atlas/engine/loader.ts"), "utf8");
    const memory = readFileSync(
      join(root, "atlas/engine/executive-memory.ts"),
      "utf8"
    );

    assert.doesNotMatch(ingest, /closeAskAtlasSitting|listExecutiveMemory/);
    assert.doesNotMatch(company, /living.?profile/i);
    assert.match(ingress, /company event/);
    assert.doesNotMatch(loader, /company-event|ingestCompanyEvents/);
    assert.match(memory, /OPERATIONAL_CONTEXT_PATTERN/);
  });
});
