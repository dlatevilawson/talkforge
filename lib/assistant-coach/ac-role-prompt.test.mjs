/**
 * Assistant Coach role-alignment: discovery-default prompt + founder-path regressions.
 * Does not import Forge coaching policy. Preserves #153 conversion semantics.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { generateAnonSecret } from "./anon-secret.ts";
import { buildAssistantCoachTurnPrompt } from "./openai-model.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { runAssistantCoachTurn } from "./turn-runtime.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

const emptyContext = {
  goals: [],
  activeFocusAreas: [],
  supportedPatterns: [],
  keyEnvironments: [],
  strengths: [],
  trainingImplications: [],
  coachingPreferences: [],
  practiceCapacity: [],
  unresolvedQuestions: [],
  recentEvidence: [],
};

const PRESENTATION_OPENER =
  "I have a presentation coming up and I need help with the delivery.";

describe("AC role prompt (onboarding understanding)", () => {
  it("defaults to understanding/discovery; forbids premature comprehensive coaching", () => {
    const prompt = buildAssistantCoachTurnPrompt({
      message: PRESENTATION_OPENER,
      history: [],
      coachContext: emptyContext,
    });

    assert.match(prompt, /onboarding understanding/i);
    assert.match(prompt, /Default mode = understanding and discovery/i);
    assert.match(prompt, /one useful reflection/i);
    assert.match(prompt, /Do not treat generic requests/i);
    assert.match(prompt, /all the above/i);
    assert.match(prompt, /narrowing or prioritization/i);
    assert.match(prompt, /concrete moment, mechanism, trigger, or stake/i);
    assert.match(prompt, /visible reply itself must contain/i);
    assert.match(
      prompt,
      /Timed curricula|multi-section practice programs|bundled techniques/i
    );
    assert.match(prompt, /Otherwise set "intervention" to null/i);
    assert.match(prompt, /one proportionate move|One move/i);

    assert.doesNotMatch(
      prompt,
      /then deliver concrete help when you have enough context/i
    );
    assert.doesNotMatch(prompt, /when still discovering/i);
    assert.doesNotMatch(prompt, /CFP-001|CFX-001|philosophy\.ts|minimal-intervention master/i);
    assert.doesNotMatch(prompt, /You are Coach Forge/i);
  });

  it("openai-model adapter does not import Forge philosophy modules", () => {
    const src = readFileSync(
      fileURLToPath(new URL("./openai-model.ts", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(src, /from ["'].*coach\/philosophy/);
    assert.doesNotMatch(src, /from ["'].*coach\/forge-core/);
    assert.match(src, /Do not import Forge coaching philosophy/);
  });
});

describe("Founder path regressions (presentation → all the above → specific)", () => {
  it("1 — presentation opener: brief discovery; intervention null; no value", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });

    const result = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: PRESENTATION_OPENER,
      clientTurnId: "founder-1",
      model: async () => ({
        reply:
          "Got it — a presentation is coming up and delivery is what you want help with. What tends to go wrong when you start speaking?",
        observations: [
          {
            text: "Has an upcoming presentation and wants delivery help",
            category: "communication_goal",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    assert.equal(result.session.hasExperiencedValue, false);
    assert.equal(result.gate.mustAuthenticateToContinue, false);
    assert.doesNotMatch(
      result.reply,
      /launch kit|curriculum|20.?minute|Daily reps|checklist|1\)|2\)|3\)/i
    );
    const assistant = (await repo.listMessages(minted.session.id)).find(
      (m) => m.role === "assistant"
    );
    assert.equal(assistant?.modelMeta?.interventionAccepted, false);
  });

  it("2 — All the above: still discovery; one narrowing question; no curriculum; intervention null", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: PRESENTATION_OPENER,
      clientTurnId: "founder-2a",
      model: async () => ({
        reply:
          "What tends to go wrong — nerves, rushing, losing the thread, or something else?",
        observations: [
          {
            text: "Upcoming presentation; wants delivery help",
            category: "communication_goal",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    // Contract for the "all the above" turn: model must stay in discovery.
    // Prompt regressions above require the adapter to instruct this behavior.
    const promptForAllAbove = buildAssistantCoachTurnPrompt({
      message: "All the above.",
      history: [
        { role: "user", content: PRESENTATION_OPENER },
        {
          role: "assistant",
          content:
            "What tends to go wrong — nerves, rushing, losing the thread, or something else?",
        },
      ],
      coachContext: emptyContext,
    });
    assert.match(promptForAllAbove, /all the above/i);
    assert.match(promptForAllAbove, /not sufficient grounding for intervention/i);
    assert.match(promptForAllAbove, /narrowing or prioritization/i);
    assert.match(promptForAllAbove, /Timed curricula|bundled techniques/i);

    const second = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "All the above.",
      clientTurnId: "founder-2b",
      model: async () => ({
        reply:
          "Those can all show up. Which one hits hardest in this presentation — nerves, rushing, or losing the thread?",
        observations: [
          {
            text: "Named several delivery issues without a clear priority",
            category: "interaction_signal",
            confidence: "medium",
          },
        ],
        intervention: null,
      }),
    });

    assert.equal(second.session.hasExperiencedValue, false);
    assert.equal(second.gate.mustAuthenticateToContinue, false);
    assert.doesNotMatch(
      second.reply,
      /launch kit|curriculum|20.?minute|Daily reps|checklist|Part 1|Part 2|warmup|Q&A drill/i
    );
    // One narrowing/prioritization question — not a multi-topic plan.
    assert.match(second.reply, /\?/);
    assert.doesNotMatch(second.reply, /1\)|2\)|3\)|Step 1|Step 2/i);
    const lastAssistant = (await repo.listMessages(minted.session.id))
      .filter((m) => m.role === "assistant")
      .at(-1);
    assert.equal(lastAssistant?.modelMeta?.interventionAccepted, false);
  });

  it("3 — specific struggle follow-up: may deepen; must not produce a program; intervention may stay null", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: PRESENTATION_OPENER,
      clientTurnId: "founder-3a",
      model: async () => ({
        reply: "What tends to go wrong when you start speaking?",
        observations: [
          {
            text: "Upcoming presentation; wants delivery help",
            category: "communication_goal",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "All the above.",
      clientTurnId: "founder-3b",
      model: async () => ({
        reply:
          "Which one hits hardest in this presentation — nerves, rushing, or losing the thread?",
        observations: [
          {
            text: "Several issues named without priority",
            category: "interaction_signal",
            confidence: "medium",
          },
        ],
        intervention: null,
      }),
    });

    const third = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message:
        "I rush and lose confidence when senior leaders challenge me.",
      clientTurnId: "founder-3c",
      model: async () => ({
        reply:
          "So when senior leaders challenge you, you rush and confidence drops. What happens in that first moment — breath, voice, or thoughts?",
        observations: [
          {
            text: "Rushes and loses confidence when senior leaders challenge",
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    assert.equal(third.session.hasExperiencedValue, false);
    assert.equal(third.gate.mustAuthenticateToContinue, false);
    assert.doesNotMatch(
      third.reply,
      /launch kit|curriculum|20.?minute|Daily reps|checklist|Part 1|program|warmup sequence/i
    );
    const msgs = await repo.listMessages(minted.session.id);
    assert.equal(
      msgs
        .filter((m) => m.role === "assistant")
        .every((m) => m.modelMeta?.interventionAccepted !== true),
      true
    );
    const draft = await repo.getDraft(minted.session.id);
    assert.ok((draft.profileJson.evidenceLedger?.length ?? 0) >= 2);
  });

  it("4 — genuine single intervention: visible reply has one proportionate move; #153 conversion intact", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: PRESENTATION_OPENER,
      clientTurnId: "founder-4a",
      model: async () => ({
        reply: "What tends to go wrong when you start speaking?",
        observations: [
          {
            text: "Upcoming presentation; wants delivery help",
            category: "communication_goal",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "All the above.",
      clientTurnId: "founder-4b",
      model: async () => ({
        reply:
          "Which one hits hardest — nerves, rushing, or losing the thread?",
        observations: [
          {
            text: "Several issues without priority",
            category: "interaction_signal",
            confidence: "medium",
          },
        ],
        intervention: null,
      }),
    });

    await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message:
        "I rush and lose confidence when senior leaders challenge me.",
      clientTurnId: "founder-4c",
      model: async () => ({
        reply:
          "What happens right as a senior leader challenges you — breath, voice, or thoughts?",
        observations: [
          {
            text: "Rushes and loses confidence when senior leaders challenge",
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    const moveSummary =
      "When a senior leader challenges you, pause for two breaths, then answer in one short sentence before elaborating.";
    const fourth = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "My throat tightens and I just push through faster.",
      clientTurnId: "founder-4d",
      model: async () => ({
        reply: `When your throat tightens under challenge, try one move: pause for two slow breaths, then answer in one short sentence before elaborating. Notice whether the rush eases.`,
        observations: [
          {
            text: "Throat tightens and they push through faster",
            category: "observed_pattern",
            confidence: "high",
          },
        ],
        intervention: {
          kind: "pacing",
          summary: moveSummary,
          groundedInCategories: ["communication_friction", "observed_pattern"],
        },
      }),
    });

    // Visible reply contains the one proportionate move (not a multi-topic plan).
    assert.match(fourth.reply, /one move|pause for two/i);
    assert.doesNotMatch(
      fourth.reply,
      /curriculum|20.?minute|Daily reps|Part 1|Part 2|checklist|1\)|2\)|3\)/i
    );

    // #153 conversion: discoveryReady + accepted intervention → value + hard gate.
    assert.equal(fourth.session.hasExperiencedValue, true);
    assert.equal(fourth.gate.mustAuthenticateToContinue, true);
    const lastAssistant = (await repo.listMessages(minted.session.id))
      .filter((m) => m.role === "assistant")
      .at(-1);
    assert.equal(lastAssistant?.modelMeta?.interventionAccepted, true);
    assert.equal(
      lastAssistant?.modelMeta?.interventionSummary,
      moveSummary
    );
    assert.equal(lastAssistant?.modelMeta?.interventionKind, "pacing");
  });
});
