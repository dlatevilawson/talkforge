/**
 * Phase 4B.1 — Living Profile evidence_ledger / profile_insights persistence.
 * Round-trip + regression: System 1 remains sole intelligence writer; member
 * payloads never include evidence/insights columns.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { applyMemberLivingProfileUpdate } from "./member-writes.ts";
import {
  LIVING_PROFILE_SELECT,
  livingProfileToRow,
  mapLivingProfileRow,
  memberLivingProfileDbPayload,
  roundTripLivingProfile,
  system1IntelligenceDbPayload,
} from "./persistence.ts";
import { emptyLivingProfile } from "./profile.ts";
import { addEvidenceToLivingProfile } from "./profile-intelligence.ts";
import { deriveProfileInsights } from "./profile-intelligence.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Phase 4B.1 migration + manifest", () => {
  it("adds evidence_ledger and profile_insights with empty defaults", () => {
    const sql = readFileSync(
      join(
        root,
        "supabase/migrations/20260816_living_profile_evidence_insights.sql"
      ),
      "utf8"
    );
    assert.match(sql, /add column if not exists evidence_ledger jsonb not null default '\[\]'::jsonb/);
    assert.match(sql, /add column if not exists profile_insights jsonb not null default '\[\]'::jsonb/);
    assert.match(sql, /OD-9/);
    assert.match(sql, /System 1/);
    assert.match(sql, /profile_evidence/);
  });

  it("lists the migration on both deployment paths", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    const name = "20260816_living_profile_evidence_insights.sql";
    assert.ok(manifest.deploymentPaths.greenfield.includes(name));
    assert.ok(manifest.deploymentPaths.existingProduction.includes(name));
  });

  it("reference schema snapshot includes the columns", () => {
    const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
    assert.match(schema, /evidence_ledger jsonb not null default '\[\]'::jsonb/);
    assert.match(schema, /profile_insights jsonb not null default '\[\]'::jsonb/);
  });
});

describe("mapLivingProfileRow defaults (backward-safe)", () => {
  it("defaults missing intelligence columns to empty arrays", () => {
    const profile = mapLivingProfileRow({
      user_id: "u1",
      version: 1,
      display_name: "Ada",
      provenance: [],
    });
    assert.deepEqual(profile.evidenceLedger, []);
    assert.deepEqual(profile.profileInsights, []);
    assert.equal(profile.displayName, "Ada");
    assert.equal(profile.version, 1);
  });

  it("defaults null intelligence columns to empty arrays", () => {
    const profile = mapLivingProfileRow({
      user_id: "u1",
      version: 2,
      evidence_ledger: null,
      profile_insights: null,
    });
    assert.deepEqual(profile.evidenceLedger, []);
    assert.deepEqual(profile.profileInsights, []);
  });
});

describe("persistence round-trip", () => {
  it("preserves System 1 evidence and insights without re-deriving", () => {
    let profile = emptyLivingProfile("user_rt", "Riley");
    profile = addEvidenceToLivingProfile(profile, {
      userId: "user_rt",
      sourceType: "assistant_coach",
      sourceId: "sess_1",
      text: "I freeze in executive updates",
      category: "communication_friction",
      confidence: "high",
    });
    profile = addEvidenceToLivingProfile(profile, {
      userId: "user_rt",
      sourceType: "assistant_coach",
      sourceId: "sess_1",
      text: "Weekly leadership standup",
      category: "communication_context",
      confidence: "medium",
    });
    const insights = deriveProfileInsights(profile.evidenceLedger);
    profile = { ...profile, profileInsights: insights, version: 3 };

    const row = livingProfileToRow(profile);
    assert.equal(row.evidence_ledger?.length, 2);
    assert.ok((row.profile_insights?.length ?? 0) >= 0);

    const back = roundTripLivingProfile(profile);
    assert.equal(back.userId, profile.userId);
    assert.equal(back.version, 3);
    assert.equal(back.displayName, "Riley");
    assert.deepEqual(back.evidenceLedger, profile.evidenceLedger);
    assert.deepEqual(back.profileInsights, profile.profileInsights);
    assert.equal(back.purposeStatement, "");
  });

  it("LIVING_PROFILE_SELECT includes intelligence columns", () => {
    assert.match(LIVING_PROFILE_SELECT, /evidence_ledger/);
    assert.match(LIVING_PROFILE_SELECT, /profile_insights/);
  });
});

describe("write authority split", () => {
  it("member DB payload omits evidence_ledger and profile_insights", () => {
    let profile = emptyLivingProfile("user_m", "Mo");
    profile = addEvidenceToLivingProfile(profile, {
      userId: "user_m",
      sourceType: "member_statement",
      sourceId: "settings",
      text: "I want clearer requests",
      category: "communication_goal",
    });
    profile = {
      ...profile,
      profileInsights: deriveProfileInsights(profile.evidenceLedger),
    };
    const next = applyMemberLivingProfileUpdate(profile, {
      purposeStatement: "Lead with clarity",
    });
    assert.ok(next.evidenceLedger.length >= 1);
    assert.equal(next.purposeStatement, "Lead with clarity");

    const memberPayload = memberLivingProfileDbPayload(next);
    assert.equal("evidence_ledger" in memberPayload, false);
    assert.equal("profile_insights" in memberPayload, false);
    assert.equal(memberPayload.purpose_statement, "Lead with clarity");
    assert.ok(Array.isArray(memberPayload.provenance));
  });

  it("System 1 intelligence payload only carries ledger + insights", () => {
    let profile = emptyLivingProfile("user_s1", "Sam");
    profile = addEvidenceToLivingProfile(profile, {
      userId: "user_s1",
      sourceType: "assistant_coach",
      sourceId: "t1",
      text: "Board Q&A makes me rush",
      category: "communication_friction",
    });
    profile = {
      ...profile,
      purposeStatement: "should not appear in intelligence payload",
      profileInsights: deriveProfileInsights(profile.evidenceLedger),
    };
    const intel = system1IntelligenceDbPayload(profile);
    assert.deepEqual(Object.keys(intel).sort(), [
      "evidence_ledger",
      "profile_insights",
    ]);
    assert.equal(intel.evidence_ledger.length, 1);
    assert.equal("purpose_statement" in intel, false);
    assert.equal("purposeStatement" in intel, false);
  });
});
