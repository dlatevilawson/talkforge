import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { classifySittingClose } from "./executive-memory.ts";
import {
  closeAskAtlasSitting,
  listExecutiveMemoryMemory,
  resetExecutiveMemoryForTests,
} from "./executive-memory-store.ts";
import {
  buildAskAtlasCounselInstructions,
  generateAtlasResponse,
} from "./reasoning.ts";
import { buildAtlasSystemPrompt } from "./prompt.ts";
import { resetRetentionForTests } from "../runtime/retention/store.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    const line = raw.split("\n").find((row) => row.startsWith("OPENAI_API_KEY="));
    if (!line) return "";
    return line.slice("OPENAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

const stubContext = {
  constitution: "TalkForge exists to help people become extraordinary communicators.",
  founderBrief: "Continue company OS work. Do not invent Canonical decisions.",
  forgeLaws: "Experiences never write identity.",
  philosophy: "Human, trustworthy, courageous.",
  projects: "ACI-001 Continuous Intelligence is Working Knowledge.",
  decisions: "No Decision in this file admits Executive Memory as Canonical.",
  roadmap: "Company OS track. SPECs stay frozen.",
  metrics: "No metrics in this stub.",
  engineeringProtocol: "Observe, hypothesize, test one cause.",
  bugLog: "No bugs in this stub.",
};

describe("ACI-001 G1 later-sitting Executive Memory recall", () => {
  afterEach(() => {
    resetExecutiveMemoryForTests();
    resetRetentionForTests();
  });

  const stored = [
    ...classifySittingClose(
      [
        {
          role: "user",
          content: "Decision: Executive Memory G1-RECALL-PROOF-ZIRCON is next.",
        },
      ],
      "sit_closed"
    ),
    ...classifySittingClose(
      [
        {
          role: "user",
          content: "Risk: Stripe webhook could fail on live keys.",
        },
      ],
      "sit_unrelated"
    ),
  ];

  it("injects relevant Operational Memory with provenance into a new sitting, not the old thread", () => {
    const { instructions, recalled } = buildAskAtlasCounselInstructions(
      buildAtlasSystemPrompt(stubContext),
      [],
      stored,
      "What did we decide about Executive Memory?"
    );
    assert.equal(recalled.length, 1);
    assert.match(recalled[0].summary, /G1-RECALL-PROOF-ZIRCON/);
    assert.match(instructions, /G1-RECALL-PROOF-ZIRCON/);
    assert.match(instructions, /not Canonical/);
    assert.match(instructions, /sitting sit_closed/);
    assert.match(instructions, /new Ask Atlas sitting/);
    assert.doesNotMatch(instructions, /Stripe webhook/);
    assert.equal(recalled[0].canonical, false);
  });

  it("does not inject irrelevant stored records into an unrelated new sitting", () => {
    const { instructions, recalled } = buildAskAtlasCounselInstructions(
      buildAtlasSystemPrompt(stubContext),
      [],
      stored,
      "What should I eat for lunch today?"
    );
    assert.equal(recalled.length, 0);
    assert.doesNotMatch(instructions, /G1-RECALL-PROOF-ZIRCON/);
    assert.doesNotMatch(instructions, /Stripe webhook/);
    assert.match(instructions, /No relevant Operational Executive Memory/);
  });

  it("Ask Atlas route recalls from stored memory, not from the Temporary thread", () => {
    const route = readFileSync(join(root, "app/api/atlas/route.ts"), "utf8");
    const reasoning = readFileSync(join(root, "atlas/engine/reasoning.ts"), "utf8");
    const panel = readFileSync(
      join(root, "app/atlas/components/AskAtlasPanel.tsx"),
      "utf8"
    );
    assert.match(route, /listExecutiveMemory/);
    assert.match(route, /executive_memory/);
    assert.match(reasoning, /retrieveRelevantExecutiveMemory/);
    assert.match(reasoning, /canonical: false/);
    assert.doesNotMatch(reasoning, /formatOperationalMemoryForCounsel\(operationalMemory\)/);
    assert.match(panel, /setThread\(\[\]\)/);
    assert.match(panel, /Temporary/);
  });

  it("reload of a new sitting recalls persisted memory, not the closed thread", async () => {
    await closeAskAtlasSitting(
      [
        {
          role: "user",
          content: "Decision: Executive Memory G1-RECALL-PROOF-ZIRCON is next.",
        },
      ],
      "sit_closed_persist"
    );
    await closeAskAtlasSitting(
      [
        {
          role: "user",
          content: "Risk: Stripe webhook could fail on live keys.",
        },
      ],
      "sit_unrelated_persist"
    );

    const reloaded = listExecutiveMemoryMemory();
    const { instructions, recalled } = buildAskAtlasCounselInstructions(
      buildAtlasSystemPrompt(stubContext),
      [],
      reloaded,
      "What did we decide about Executive Memory?"
    );

    assert.ok(reloaded.length >= 2);
    assert.equal(recalled.length, 1);
    assert.match(recalled[0].summary, /G1-RECALL-PROOF-ZIRCON/);
    assert.match(instructions, /sitting sit_closed_persist/);
    assert.match(instructions, /not Canonical/);
    assert.doesNotMatch(instructions, /Stripe webhook/);
    assert.equal(recalled[0].canonical, false);
  });

  it("Atlas uses retrieved Operational Memory in an independent sitting", { timeout: 90_000 }, async (t) => {
    const key = loadOpenAiKey();
    if (!key) {
      t.skip("OPENAI_API_KEY is not available");
      return;
    }
    process.env.OPENAI_API_KEY = key;

    const result = await generateAtlasResponse(
      "What did we decide about Executive Memory? Use Operational Memory if it is relevant. Say whether that memory is Canonical.",
      stubContext,
      [],
      stored
    );

    assert.equal(result.canonical, false);
    assert.equal(result.recalled.length, 1);
    assert.match(result.recalled[0].summary, /G1-RECALL-PROOF-ZIRCON/);
    assert.match(result.response, /G1-RECALL-PROOF-ZIRCON/i);
    assert.match(result.response, /not Canonical|Operational|not admitted/i);
    assert.doesNotMatch(result.response, /Stripe webhook/i);
  });
});
