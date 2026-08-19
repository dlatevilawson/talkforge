/**
 * Phase 4B.5 — semantic value + turn-cap gate flag tests.
 * Refined: discovery ≠ experienced value; intervention required.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAnonSecret } from "./anon-secret.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { runAssistantCoachTurn } from "./turn-runtime.ts";
import {
  computeDiscoveryReady,
  computeHasExperiencedValue,
  isVagueAspirationOnly,
} from "./semantic-value.ts";
import { buildGateFlags } from "./gate-flags.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";
import { validateCoachIntervention } from "./intervention.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

function goalEvidence(text = "Wants delivery help for an upcoming presentation") {
  return {
    id: "1",
    userId: "u",
    sourceType: "assistant_coach",
    sourceId: "s",
    observedAt: "2026-01-01T00:00:00.000Z",
    text,
    category: "communication_goal",
    confidence: "high",
    metadata: {},
  };
}

function frictionEvidence(
  text = "Rushes and loses confidence around senior people"
) {
  return {
    id: "2",
    userId: "u",
    sourceType: "assistant_coach",
    sourceId: "s",
    observedAt: "2026-01-01T00:00:00.000Z",
    text,
    category: "communication_friction",
    confidence: "high",
    metadata: {},
  };
}

const discoveryMessages = [
  {
    role: "user",
    content:
      "I have a presentation coming up and I want help with my delivery.",
  },
  { role: "assistant", content: "What tends to go wrong when you present?" },
  {
    role: "user",
    content:
      "Around senior people I rush, my confidence drops, and I lose the thread.",
  },
];

describe("4B.5 semantic value", () => {
  it("requires at least two substantive user turns for discovery", () => {
    assert.equal(
      computeDiscoveryReady({
        evidenceLedger: [goalEvidence(), frictionEvidence()],
        profileInsights: [],
        messages: [{ role: "user", content: "only one long enough turn here" }],
      }),
      false
    );
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [goalEvidence(), frictionEvidence()],
        profileInsights: [],
        messages: [{ role: "user", content: "only one long enough turn here" }],
        hasActionableIntervention: true,
      }),
      false
    );
  });

  it("discovery (goal + friction) alone is NOT experienced value", () => {
    assert.equal(
      computeDiscoveryReady({
        evidenceLedger: [goalEvidence(), frictionEvidence()],
        profileInsights: [],
        messages: discoveryMessages,
      }),
      true
    );
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [goalEvidence(), frictionEvidence()],
        profileInsights: [],
        messages: discoveryMessages,
        hasActionableIntervention: false,
      }),
      false
    );
  });

  it("path V1 + validated intervention → experienced value", () => {
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [goalEvidence(), frictionEvidence()],
        profileInsights: [],
        messages: discoveryMessages,
        hasActionableIntervention: true,
      }),
      true
    );
  });

  it("vague aspiration alone does not count as value", () => {
    assert.equal(isVagueAspirationOnly("be better"), true);
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [
          {
            id: "1",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "be better",
            category: "communication_goal",
            confidence: "low",
            metadata: {},
          },
        ],
        profileInsights: [],
        messages: [
          { role: "user", content: "I want to be better at talking" },
          { role: "user", content: "Just improve overall somehow" },
        ],
        hasActionableIntervention: true,
      }),
      false
    );
  });

  it("intervention without discovery readiness does not flip value", () => {
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [],
        profileInsights: [],
        messages: discoveryMessages,
        hasActionableIntervention: true,
      }),
      false
    );
  });
});

describe("Coach intervention validation", () => {
  it("accepts grounded actionable intervention", () => {
    const decision = validateCoachIntervention(
      {
        kind: "technique",
        summary:
          "Before the next senior Q&A, pause for two breaths and open with one prepared sentence.",
        groundedInCategories: ["communication_friction", "communication_goal"],
      },
      [goalEvidence(), frictionEvidence()]
    );
    assert.equal(decision.accepted, true);
  });

  it("rejects reflection-shaped missing intervention", () => {
    assert.equal(
      validateCoachIntervention(null, [goalEvidence(), frictionEvidence()])
        .accepted,
      false
    );
  });

  it("rejects intervention not grounded in ledger facts", () => {
    const decision = validateCoachIntervention(
      {
        kind: "wording",
        summary: "Try opening with a one-sentence stake for your audience.",
        groundedInCategories: ["communication_friction"],
      },
      [goalEvidence()] // no friction in ledger
    );
    assert.equal(decision.accepted, false);
    if (!decision.accepted) {
      assert.equal(decision.reason, "grounding_not_in_ledger");
    }
  });
});

describe("Founder path: discovery then intervention then gate", () => {
  it("presentation help → senior rushing → no value until actionable intervention", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });

    const discoveryModel = async ({ message }) => ({
      reply: "What happens in your body when that starts?",
      observations: [
        {
          text: message.slice(0, 200),
          category: message.toLowerCase().includes("senior")
            ? "communication_friction"
            : "communication_goal",
          confidence: "high",
        },
      ],
      // Explicitly no intervention — discovery / reflection only
      intervention: null,
    });

    const first = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message:
        "I have a presentation coming up and I want help with my delivery.",
      clientTurnId: "f1",
      model: discoveryModel,
    });
    assert.equal(first.session.hasExperiencedValue, false);
    assert.equal(first.gate.mustAuthenticateToContinue, false);
    const draft1 = await repo.getDraft(minted.session.id);
    assert.ok((draft1.profileJson.evidenceLedger?.length ?? 0) >= 1);

    const second = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message:
        "Around senior people I rush, my confidence drops, and I lose the thread.",
      clientTurnId: "f2",
      model: discoveryModel,
    });
    // Discovery complete — still no value / no gate
    assert.equal(second.session.hasExperiencedValue, false);
    assert.equal(second.gate.mustAuthenticateToContinue, false);
    const draft2 = await repo.getDraft(minted.session.id);
    const ledger = draft2.profileJson.evidenceLedger ?? [];
    assert.ok(ledger.length >= 2, "evidence continues accumulating");
    assert.equal(
      draft2.profileJson.profileComplete,
      undefined,
      "LP not declared complete"
    );

    const third = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "What should I actually practice before I go in?",
      clientTurnId: "f3",
      model: async () => ({
        reply:
          "Try this: before each senior question, plant both feet, take two slow breaths, then open with one prepared sentence naming the point. Rehearse that opener aloud three times today.",
        observations: [
          {
            text: "Wants a concrete practice before the presentation",
            category: "desired_outcome",
            confidence: "medium",
          },
        ],
        intervention: {
          kind: "rehearsal",
          summary:
            "Rehearse a two-breath pause plus one prepared opener sentence three times before the senior presentation.",
          groundedInCategories: [
            "communication_friction",
            "communication_goal",
          ],
        },
      }),
    });
    assert.equal(third.session.hasExperiencedValue, true);
    assert.equal(third.gate.mustAuthenticateToContinue, true);

    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: repo,
          session: third.session,
          message: "Can we do another exercise?",
          clientTurnId: "f4",
          model: async () => ({
            reply: "After you create an account we can continue.",
            observations: [],
          }),
        }),
      (err) => err && err.code === "must_authenticate"
    );
    const after = await repo.getSession(minted.session.id);
    assert.equal(after.hasExperiencedValue, true);
    assert.equal(after.status, "gated");
    const draft3 = await repo.getDraft(minted.session.id);
    assert.ok((draft3.profileJson.evidenceLedger?.length ?? 0) >= 2);
  });

  it("sticky hasExperiencedValue once intervention-backed value is achieved", async () => {
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
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "v1",
      model: async ({ message }) => ({
        reply: "What happens in that moment?",
        observations: [
          {
            text: message,
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
      message: "I freeze when the CEO asks me a direct question on the spot",
      clientTurnId: "v2",
      model: async ({ message }) => ({
        reply: "Here is a concrete move for that freeze.",
        observations: [
          {
            text: message,
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: {
          kind: "technique",
          summary:
            "When the CEO asks, buy two seconds with a sip of water, then answer in one short sentence first.",
          groundedInCategories: ["communication_friction"],
        },
      }),
    });
    assert.equal(second.session.hasExperiencedValue, true);
    assert.equal(second.gate.mustAuthenticateToContinue, true);

    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: repo,
          session: second.session,
          message: "Also my throat tightens before I answer",
          clientTurnId: "v3",
          model: async () => ({
            reply: "Stay with that.",
            observations: [],
          }),
        }),
      (err) => err && err.code === "must_authenticate"
    );
    const after = await repo.getSession(minted.session.id);
    assert.equal(after.hasExperiencedValue, true);
    assert.equal(after.status, "gated");
  });
});

describe("4B.5 turn cap flags", () => {
  it("cap alone sets mustAuthenticate without setting value", () => {
    const gate = buildGateFlags(
      {
        id: "s",
        anonKeyHash: "h",
        userId: null,
        status: "active",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        lastActiveAt: new Date().toISOString(),
        turnCount: 10,
        hasExperiencedValue: false,
        claimedAt: null,
      },
      { turnCap: 10, isAnonymous: true }
    );
    assert.equal(gate.hasExperiencedValue, false);
    assert.equal(gate.mustAuthenticateToContinue, true);
    assert.equal(gate.turnCap, 10);
  });

  it("default turn cap remains independent economic limit", () => {
    assert.equal(getAssistantCoachAnonTurnCap({}), 10);
    assert.equal(
      getAssistantCoachAnonTurnCap({ ASSISTANT_COACH_ANON_TURN_CAP: "7" }),
      7
    );
  });
});

describe("4B.6 hard gate", () => {
  it("blocks further anon turns after value without calling model", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
    });
    let calls = 0;
    await assert.rejects(
      async () =>
        runAssistantCoachTurn({
          repository: repo,
          session: await repo.getSession(minted.session.id),
          message: "one more question",
          clientTurnId: "blocked-1",
          model: async () => {
            calls += 1;
            return { reply: "should not run", observations: [] };
          },
        }),
      (err) =>
        err &&
        err.code === "must_authenticate" &&
        err.status === 403 &&
        err.gate?.mustAuthenticateToContinue === true
    );
    assert.equal(calls, 0);
    const session = await repo.getSession(minted.session.id);
    assert.equal(session.status, "gated");
  });

  it("allows idempotent replay of last allowed turn after gate", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const first = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "last-ok",
      model: async () => ({
        reply: "What happens in that moment?",
        observations: [
          {
            text: "Wants to speak clearly in board meetings",
            category: "communication_goal",
            confidence: "high",
          },
        ],
        intervention: null,
      }),
    });
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    const replay = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "last-ok",
      model: async () => ({ reply: "nope", observations: [] }),
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.reply, first.reply);
  });

  it("auth member with claimed session is not hard-gated by anon value rule", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const userId = "11111111-1111-1111-1111-111111111111";
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    const claimed = {
      ...(await repo.getSession(minted.session.id)),
      userId,
      status: "claimed",
      claimedAt: new Date().toISOString(),
      hasExperiencedValue: true,
    };
    const { emptyLivingProfile } = await import("../system1/profile.ts");
    const wrapping = {
      ...repo,
      async getSession(id) {
        if (id === claimed.id) return claimed;
        return repo.getSession(id);
      },
    };
    const result = await runAssistantCoachTurn({
      repository: wrapping,
      session: claimed,
      message: "Help me rehearse the opening again",
      clientTurnId: "member-1",
      authUserId: userId,
      memberProfile: {
        ...emptyLivingProfile(userId),
        purposeStatement: "Member owned",
      },
      model: async () => ({
        reply: "Let’s rehearse that opening once more.",
        observations: [],
      }),
    });
    assert.equal(result.idempotentReplay, false);
    assert.match(result.reply, /rehearse/i);
  });
});
