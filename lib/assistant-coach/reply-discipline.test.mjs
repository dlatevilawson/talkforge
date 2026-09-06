/**
 * Server-side understanding discipline — prompt text is not enough.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAnonSecret } from "./anon-secret.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import {
  disciplineAssistantCoachOutput,
  isCurriculumText,
  UNDERSTANDING_FALLBACK,
} from "./reply-discipline.ts";
import { memberEvidenceFromTurn, toMemberFacingYou } from "./confirmation.ts";
import { runAssistantCoachTurn } from "./turn-runtime.ts";
import { validateModelObservations } from "./observations.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

const SEVEN_SCRIPTS = `Here are seven texts you can copy and tweak:

1. Hey — it's been a while. Want to grab coffee?
2. I miss hanging out. Are you free this week?
3. Saw something that made me think of you.
4. No pressure, just wanted to say hi.
5. Can we catch up this weekend?
6. Thinking of you. How have you been?
7. I'd love to hear what you've been up to.`;

const STARTER_REPLIES = [
  {
    message: "I’m preparing for an interview.",
    reply:
      "You’re getting ready for an interview and want support preparing for that conversation. Who’s the interview with — a recruiter, hiring manager, or panel?",
    expected:
      "Who’s the interview with — a recruiter, hiring manager, or panel?",
  },
  {
    message: "I’m preparing for a salary negotiation.",
    reply:
      "You’re preparing to discuss your salary. Who are you negotiating with?",
    expected: "Who are you negotiating with?",
  },
  {
    message: "I’m preparing for a difficult feedback conversation.",
    reply:
      "It sounds like you need to give difficult feedback. Who needs the feedback?",
    expected: "Who needs the feedback?",
  },
  {
    message: "I’m preparing to set a boundary.",
    reply:
      "You want help setting a boundary. Who is the boundary with?",
    expected: "Who is the boundary with?",
  },
];

describe("Starter-turn response discipline", () => {
  it("removes paraphrase preambles and retains one useful question", () => {
    for (const example of STARTER_REPLIES) {
      const out = disciplineAssistantCoachOutput({
        reply: example.reply,
        intervention: null,
        userMessages: [example.message],
      });
      assert.equal(out.reply, example.expected);
      assert.equal((out.reply.match(/\?/g) ?? []).length, 1);
    }
  });

  it("does not rewrite direct questions or non-starter turns", () => {
    const direct = "Who’s the interview with — a recruiter or hiring manager?";
    assert.equal(
      disciplineAssistantCoachOutput({
        reply: direct,
        intervention: null,
        userMessages: [STARTER_REPLIES[0].message],
      }).reply,
      direct
    );

    const ordinary =
      "That sounds difficult. Who is usually in the room when it happens?";
    assert.equal(
      disciplineAssistantCoachOutput({
        reply: ordinary,
        intervention: null,
        userMessages: ["My manager interrupts me in meetings."],
      }).reply,
      ordinary
    );
  });

  it("uses a direct fallback without a reflective preamble", () => {
    assert.equal(
      UNDERSTANDING_FALLBACK,
      "Who is that conversation with — and what do you need to say or start?"
    );
    assert.doesNotMatch(UNDERSTANDING_FALLBACK, /I hear you/i);
  });
});

describe("Curriculum detection", () => {
  it("flags a seven-script dump and not a single first move", () => {
    assert.equal(isCurriculumText(SEVEN_SCRIPTS), true);
    assert.equal(
      isCurriculumText(
        "When you start that conversation, try: “Hey — it’s been a while. Want to grab coffee?” Then stop and listen."
      ),
      false
    );
  });

  it("clips the dump to an understanding turn and withholds intervention", () => {
    const out = disciplineAssistantCoachOutput({
      reply: SEVEN_SCRIPTS,
      intervention: {
        kind: "wording",
        summary:
          "1. Send text A. 2. Send text B. 3. Send text C. Copy these seven openers.",
        groundedInCategories: ["communication_friction"],
      },
      userMessages: [
        "I’m having a midlife crisis and I don’t know how to connect with my friends",
        "Starting a conversation",
      ],
    });
    assert.equal(out.clippedCurriculum, true);
    assert.equal(out.withheldIntervention, true);
    assert.equal(out.intervention, null);
    assert.doesNotMatch(out.reply, /1\.\s+Hey/);
    assert.doesNotMatch(out.reply, /seven texts/i);
    assert.ok(out.reply.length > 0);
  });

  it("does not treat all the above as intervention grounding", () => {
    const out = disciplineAssistantCoachOutput({
      reply: "Here is a first sentence you could try with a friend.",
      intervention: {
        kind: "wording",
        summary: "Use one short hello and then ask a real question.",
        groundedInCategories: ["communication_friction"],
      },
      userMessages: ["all the above"],
    });
    assert.equal(out.withheldIntervention, true);
    assert.equal(out.intervention, null);
  });
});

describe("Runtime withholds a script dump from conversion", () => {
  it("does not gate after a curriculum reply", async () => {
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
        "Hello! I’m having a midlife crises and I don’t know how to connect with my friends",
      clientTurnId: "d1",
      model: async ({ message }) => ({
        reply: "What’s the hardest part of connecting?",
        observations: [
          {
            text: "They likely want to feel reconnected and supported by friends.",
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
      message: "Starting a conversation",
      clientTurnId: "d2",
      model: async () => ({
        reply: SEVEN_SCRIPTS,
        observations: [
          {
            text: "They report that starting the conversation is the hardest part.",
            category: "communication_friction",
            confidence: "high",
          },
        ],
        intervention: {
          kind: "wording",
          summary:
            "Copy these seven texts and tweak them for each friend this week.",
          groundedInCategories: ["communication_friction"],
        },
      }),
    });

    assert.doesNotMatch(second.reply, /1\.\s+Hey/);
    assert.match(second.reply, /who is that conversation|I hear you|start/i);
    assert.equal(second.session.hasExperiencedValue, false);
    assert.equal(second.gate.mustAuthenticateToContinue, false);
    const draft = await repo.getDraft(minted.session.id);
    const texts = (draft.profileJson.evidenceLedger ?? []).map((e) => e.text);
    assert.equal(texts.some((t) => /^They likely/i.test(t)), false);
    assert.ok(texts.some((t) => /connect with your friends/i.test(t)));
    void UNDERSTANDING_FALLBACK;
  });
});

describe("Member evidence from what they said", () => {
  it("records the friends struggle as friction, not they-likely", () => {
    const ev = memberEvidenceFromTurn(
      "Hello! I’m having a midlife crises and I don’t know how to connect with my friends"
    );
    assert.ok(ev);
    assert.equal(ev.category, "communication_friction");
    assert.match(ev.text, /connect with your friends/i);
    assert.doesNotMatch(ev.text, /^They\b/);
  });

  it("records starting a conversation as the lived moment", () => {
    const ev = memberEvidenceFromTurn("Starting a conversation", [
      "I don’t know how to connect with my friends",
    ]);
    assert.ok(ev);
    assert.equal(ev.category, "lived_example");
    assert.match(ev.text, /conversation with a friend/i);
  });

  it("rewrites they-likely observations at ingest", () => {
    const decisions = validateModelObservations([
      {
        text: "They likely want to feel reconnected and supported by friends.",
        category: "communication_goal",
        confidence: "high",
      },
    ]);
    assert.equal(decisions[0].accepted, true);
    if (decisions[0].accepted) {
      assert.match(decisions[0].text, /^You want/i);
    }
    assert.match(
      toMemberFacingYou(
        "They report that starting the conversation is the hardest part."
      ),
      /^You find that|^You said/i
    );
  });
});
