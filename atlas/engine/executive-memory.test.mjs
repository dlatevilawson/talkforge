import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXECUTIVE_MEMORY_KINDS,
  assertNeverCanonical,
  classifySittingClose,
  extractExecutiveMemoryCandidates,
  formatOperationalMemoryForCounsel,
} from "./executive-memory.ts";
import {
  closeAskAtlasSitting,
  listExecutiveMemoryMemory,
  resetExecutiveMemoryForTests,
} from "./executive-memory-store.ts";
import { getRetentionSnapshot, resetRetentionForTests } from "../runtime/retention/store.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const KIND_PHRASES = {
  correction: "That's wrong. Do not say the sprint is Canonical.",
  decision: "Decision: Executive Memory is the next slice.",
  commitment: "I commit we will ship Memory Keeper on sitting close.",
  risk: "Risk: this could fail if chat auto-Canonicalizes.",
  mistake: "Mistake: we got this wrong by treating sittings as Constitution.",
  lesson: "Lesson: we learned that sittings must close into Memory Keeper.",
  unresolved: "Unresolved: still open whether GitHub events ingest next.",
};

afterEach(() => {
  resetExecutiveMemoryForTests();
  resetRetentionForTests();
});

describe("ACI-001 G1 Executive Memory Keeper", () => {
  it("extracts each eligible kind as Operational, never Canonical", () => {
    for (const kind of EXECUTIVE_MEMORY_KINDS) {
      const phrase = KIND_PHRASES[kind];
      const records = classifySittingClose(
        [{ role: "user", content: phrase }],
        `sit_${kind}`
      );
      assert.equal(records.length, 1, kind);
      assert.equal(records[0].kind, kind);
      assert.equal(records[0].class, "operational");
      assert.equal(records[0].canonical, false);
      assert.equal(records[0].provenance.source, "ask-atlas-sitting");
    }
  });

  it("eligible kinds become Promotion Candidate when Founder asks to promote", () => {
    for (const kind of EXECUTIVE_MEMORY_KINDS) {
      const phrase = `${KIND_PHRASES[kind]} Promote this as a Canonical candidate.`;
      const records = classifySittingClose(
        [{ role: "user", content: phrase }],
        `sit_promo_${kind}`
      );
      assert.equal(records.length, 1, kind);
      assert.equal(records[0].kind, kind);
      assert.equal(records[0].class, "promotion_candidate");
      assert.equal(records[0].canonical, false);
    }
  });

  it("chit-chat extracts nothing; Temporary sitting simply ends", () => {
    const records = classifySittingClose(
      [
        { role: "user", content: "What should I look at this morning?" },
        { role: "assistant", content: "Start with the Founder Brief." },
        { role: "user", content: "Thanks. Carry on." },
      ],
      "sit_chat"
    );
    assert.equal(records.length, 0);
    assert.equal(
      extractExecutiveMemoryCandidates(
        [{ role: "assistant", content: "Decision: Atlas should invent policy." }],
        "sit_assistant"
      ).length,
      0
    );
  });

  it("raw thread is not admitted as Canonical", () => {
    const thread = [
      { role: "user", content: "Decision: ship G1." },
      { role: "assistant", content: "I will treat that as Constitution." },
    ];
    const records = classifySittingClose(thread, "sit_raw");
    assert.equal(records.length, 1);
    assert.equal(records[0].canonical, false);
    assertNeverCanonical(records);
    assert.throws(
      () => assertNeverCanonical([{ canonical: true }]),
      /canonical must be false/
    );
  });

  it("counsel formatting never labels records Canonical", () => {
    const records = classifySittingClose(
      [{ role: "user", content: "Decision: keep SPECs frozen." }],
      "sit_format"
    );
    const block = formatOperationalMemoryForCounsel(records);
    assert.match(block, /not Canonical/);
    assert.doesNotMatch(block, /is Canonical/);
    assert.equal(formatOperationalMemoryForCounsel([]), "");
  });

  it("sitting close persists Operational Memory without Canonical admission", async () => {
    const result = await closeAskAtlasSitting(
      [{ role: "user", content: "Lesson: we learned classification precedes storage." }],
      "sit_store"
    );
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].canonical, false);
    assert.equal(result.records[0].class, "operational");

    const listed = listExecutiveMemoryMemory();
    assert.equal(listed.some((row) => row.sitting_id === "sit_store"), true);
    assert.equal(listed.every((row) => row.canonical === false), true);

    const retention = getRetentionSnapshot();
    assert.equal(retention.promoStaging.length, 0);
    assert.ok(retention.ops.length >= 1);
    assert.equal(retention.ops.every((row) => row.canonical === false), true);
  });

  it("Promotion Candidate stages without publishing Canonical", async () => {
    const result = await closeAskAtlasSitting(
      [
        {
          role: "user",
          content:
            "Decision: Memory Keeper is G1. Promote this as a Canonical candidate.",
        },
      ],
      "sit_stage"
    );
    assert.equal(result.records[0].class, "promotion_candidate");
    assert.equal(result.records[0].canonical, false);
    const retention = getRetentionSnapshot();
    assert.equal(retention.promoStaging.length, 1);
    assert.equal(retention.promoStaging[0].canonical, false);
    assert.equal(retention.promoStaging[0].auto_published, false);
  });

  it("surfaces sitting close and never mixes Executive Memory into Founder Notes", () => {
    const panel = readFileSync(
      join(root, "app/atlas/components/AskAtlasPanel.tsx"),
      "utf8"
    );
    const memoryPanel = readFileSync(
      join(root, "app/atlas/components/ExecutiveMemoryPanel.tsx"),
      "utf8"
    );
    const founderOs = readFileSync(join(root, "app/atlas/FounderOS.tsx"), "utf8");
    const notes = readFileSync(
      join(root, "app/atlas/components/FounderNotesPanel.tsx"),
      "utf8"
    );
    const loader = readFileSync(join(root, "atlas/engine/loader.ts"), "utf8");
    const closeRoute = readFileSync(
      join(root, "app/api/atlas/sitting/close/route.ts"),
      "utf8"
    );
    const memoryRoute = readFileSync(
      join(root, "app/api/atlas/memory/route.ts"),
      "utf8"
    );

    assert.match(panel, /Close sitting/);
    assert.match(panel, /\/api\/atlas\/sitting\/close/);
    assert.match(panel, /not Canonical/);
    assert.match(memoryPanel, /not Canonical/);
    assert.match(founderOs, /ExecutiveMemoryPanel/);
    assert.doesNotMatch(notes, /executiveMemory/);
    assert.doesNotMatch(loader, /executiveMemory|executive-memory/);
    assert.match(closeRoute, /closeAskAtlasSitting/);
    assert.match(closeRoute, /canonical: false/);
    assert.match(memoryRoute, /listExecutiveMemory/);
    assert.match(memoryRoute, /canonical: false/);
  });
});
