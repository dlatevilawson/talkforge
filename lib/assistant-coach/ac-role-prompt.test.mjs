/**
 * Assistant Coach role-alignment: discovery-default prompt + runtime scenarios.
 * Does not import Forge coaching policy.
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

describe("AC role prompt (onboarding understanding)", () => {
  it("defaults to understanding/discovery; forbids premature comprehensive coaching mandate", () => {
    const prompt = buildAssistantCoachTurnPrompt({
      message: "I have a presentation coming up and I need help with the delivery",
      history: [],
      coachContext: emptyContext,
    });

    assert.match(prompt, /onboarding understanding/i);
    assert.match(prompt, /Default mode = understanding and discovery/i);
    assert.match(prompt, /one useful reflection/i);
    assert.match(prompt, /Do not treat generic requests/i);
    assert.match(prompt, /launch kits|curricula|exhaustive checklists/i);
    assert.match(prompt, /intervention.*null/i);
    assert.match(prompt, /one useful move|One move/i);

    // Removed #153 behavioral overreach (conversion contract remains elsewhere).
    assert.doesNotMatch(
      prompt,
      /then deliver concrete help when you have enough context/i
    );
    assert.doesNotMatch(prompt, /when still discovering/i);

    // Must not wire Forge craft into AC.
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

describe("AC role scenarios A/B/C (runtime + #153 conversion)", () => {
  it("A — insufficient context: discovery reply, no intervention, no value", async () => {
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
      message:
        "I have a presentation coming up and I need help with the delivery",
      clientTurnId: "role-a1",
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
    assert.doesNotMatch(result.reply, /launch kit|1\)|Daily reps|numbered/i);
    const assistant = (await repo.listMessages(minted.session.id)).find(
      (m) => m.role === "assistant"
    );
    assert.equal(assistant?.modelMeta?.interventionAccepted, false);
  });

  it("B — specificity develops: deepen struggle; intervention not required on turn 2", async () => {
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
      message:
        "I have a presentation coming up and I need help with the delivery",
      clientTurnId: "role-b1",
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

    const second = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message:
        "When I present to senior leaders I rush and my confidence disappears.",
      clientTurnId: "role-b2",
      model: async () => ({
        reply:
          "So with senior leaders in the room, you speed up and confidence drops. What happens in that first moment — breath, voice, or thoughts?",
        observations: [
          {
            text: "Rushes and loses confidence presenting to senior leaders",
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    assert.equal(second.session.hasExperiencedValue, false);
    assert.equal(second.gate.mustAuthenticateToContinue, false);
    const msgs = await repo.listMessages(minted.session.id);
    assert.equal(
      msgs.filter((m) => m.role === "assistant").every(
        (m) => m.modelMeta?.interventionAccepted !== true
      ),
      true
    );
    const draft = await repo.getDraft(minted.session.id);
    assert.ok((draft.profileJson.evidenceLedger?.length ?? 0) >= 2);
  });

  it("C — earned intervention: one grounded move may flip #153 value", async () => {
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
      message:
        "I have a presentation coming up and I need help with the delivery",
      clientTurnId: "role-c1",
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
      message:
        "When I present to senior leaders I rush and my confidence disappears.",
      clientTurnId: "role-c2",
      model: async () => ({
        reply: "What happens right as you start speeding up?",
        observations: [
          {
            text: "Rushes and loses confidence with senior leaders",
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });

    const third = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "My throat tightens and I just push through faster.",
      clientTurnId: "role-c3",
      model: async () => ({
        reply:
          "When your throat tightens, try one move: pause for two slow breaths before the next sentence, then speak one short line. Notice whether the rush eases.",
        observations: [
          {
            text: "Throat tightens and they push through faster",
            category: "observed_pattern",
            confidence: "high",
          },
        ],
        intervention: {
          kind: "pacing",
          summary:
            "When the throat tightens, pause for two breaths before the next sentence, then deliver one short line.",
          groundedInCategories: ["communication_friction", "observed_pattern"],
        },
      }),
    });

    assert.equal(third.session.hasExperiencedValue, true);
    assert.equal(third.gate.mustAuthenticateToContinue, true);
    const lastAssistant = (await repo.listMessages(minted.session.id))
      .filter((m) => m.role === "assistant")
      .at(-1);
    assert.equal(lastAssistant?.modelMeta?.interventionAccepted, true);
  });
});
