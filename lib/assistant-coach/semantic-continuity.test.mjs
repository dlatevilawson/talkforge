/**
 * Semantic continuity audit: one identified moment through
 * AC evidence → claim → confirmation → Forge href.
 *
 * Does not change #153 conversion, AC prompts, Forge Core, Progress,
 * Assessment, or Living Profile architecture.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  sealAnonCookieValue,
} from "./anon-cookie.ts";
import { claimAssistantCoachSession } from "./claim.ts";
import {
  buildConfirmationView,
  buildFirstPracticeHref,
  isConfirmedForgeHandoffHref,
  isPracticableMoment,
  toMemberFacingYou,
} from "./confirmation.ts";
import { handleAssistantCoachClaimRequest } from "./http-claim.ts";
import { handleAssistantCoachConfirmRequest } from "./http-confirm.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { emptyLivingProfile } from "../system1/profile.ts";
import { addProfileEvidence } from "../system1/profile-evidence.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";
const NOW = "2026-08-20T12:00:00.000Z";

const INTERVIEW_OPENER =
  "when they ask me tell them a little about myself and why they should hire me";
const WIFE_MOMENT =
  "I need to tell my wife I’m considering a career change";

function ev(id, text, category, sourceType = "assistant_coach") {
  return addProfileEvidence([], {
    id,
    userId: "u",
    sourceType,
    sourceId: id,
    observedAt: NOW,
    text,
    category,
    confidence: "high",
  })[0];
}

function profileStore(seed) {
  return {
    profile: seed,
    saveCount: 0,
    async loadOrCreate() {
      return this.profile;
    },
    async saveMerged(next) {
      this.saveCount += 1;
      this.profile = next;
      return next;
    },
    async markOnboardingComplete() {
      this.complete = true;
    },
  };
}

async function seedAnonSession(repo, { draft, userMessages }) {
  const rawSecret = generateAnonSecret();
  const minted = await ensureAnonAssistantCoachSession({
    repository: repo,
    cookieSecret: TEST_SECRET,
    mintKey: rawSecret,
    secureCookie: false,
  });
  await repo.saveDraft({
    sessionId: minted.session.id,
    version: 2,
    profileJson: draft,
  });
  let turn = 0;
  for (const content of userMessages) {
    await repo.appendMessage({
      sessionId: minted.session.id,
      turnIndex: turn,
      role: "user",
      content,
      modelMeta: {},
    });
    await repo.appendMessage({
      sessionId: minted.session.id,
      turnIndex: turn,
      role: "assistant",
      content: "Tell me more about that moment.",
      modelMeta: {},
    });
    turn += 1;
  }
  await repo.updateSessionFlags(minted.session.id, {
    status: "gated",
    hasExperiencedValue: true,
  });
  return { minted, rawSecret };
}

describe("Practicable moment vs topic", () => {
  it("career change is context; telling my wife is the moment", () => {
    assert.equal(isPracticableMoment("Considering a career change"), false);
    assert.equal(isPracticableMoment("Job interview prep"), false);
    assert.equal(isPracticableMoment("I don’t know how to connect with my friends"), false);
    assert.equal(isPracticableMoment(WIFE_MOMENT), true);
    assert.equal(isPracticableMoment(INTERVIEW_OPENER), true);
    assert.equal(isPracticableMoment("Starting a conversation"), true);
    assert.equal(isPracticableMoment("Starting a conversation with a friend"), true);
  });

  it("member-facing copy uses you, not they/Has, and keeps when they ask", () => {
    const you = toMemberFacingYou(
      "Has a job interview coming up and wants to be prepared"
    );
    assert.match(you, /^You have/i);
    assert.doesNotMatch(you, /\bHas\b/);
    assert.doesNotMatch(you, /\bthey have a job\b/i);
    const scene = toMemberFacingYou(INTERVIEW_OPENER);
    assert.match(scene, /when they ask/i);
    assert.doesNotMatch(scene, /when you ask me tell them/i);
    assert.match(
      toMemberFacingYou("They likely want to feel reconnected and supported by friends."),
      /^You want/i
    );
    assert.match(
      toMemberFacingYou(
        "They report that starting the conversation is the hardest part of reconnecting with friends."
      ),
      /^You find that/i
    );
  });
});

describe("Fresh visitor canonical trace", () => {
  it("interview opener survives claim → confirm → Forge title", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const { minted, rawSecret } = await seedAnonSession(repo, {
      draft: {
        evidenceLedger: [
          ev(
            "g",
            "Has a job interview coming up and wants to be prepared",
            "communication_goal"
          ),
          ev(
            "f",
            "Rushes and loses confidence when put on the spot",
            "communication_friction"
          ),
        ],
      },
      userMessages: [
        "I have a job interview coming up and I want to be prepared.",
        "I get brain fog.",
        INTERVIEW_OPENER,
      ],
    });

    const store = profileStore(emptyLivingProfile("fresh-user", "Avery"));
    const claimed = await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "fresh-user",
      profiles: store,
    });

    assert.deepEqual(claimed.userMessages.slice(-1), [INTERVIEW_OPENER]);
    const view = buildConfirmationView(claimed.draftProfile, {
      userMessages: claimed.userMessages,
    });
    assert.equal(view.canContinue, true);
    assert.match(view.workingOn, /^You have a job interview/i);
    assert.match(view.difficulty, /^You rush and lose/i);
    assert.match(view.identifiedMoment, /tell them a little about myself/i);
    assert.doesNotMatch(view.identifiedMoment, /^They\b/);
    assert.doesNotMatch(view.identifiedMoment, /^Has\b/);

    const href = buildFirstPracticeHref(view);
    assert.equal(isConfirmedForgeHandoffHref(href), true);
    const title = new URL(href, "https://talkforge.local").searchParams.get(
      "title"
    );
    assert.equal(title, view.identifiedMoment);
    assert.match(href, /source=ac/);
    assert.doesNotMatch(href, /Board|alive|focus/i);

    const cookie = sealAnonCookieValue(rawSecret, TEST_SECRET);
    const httpClaim = await handleAssistantCoachClaimRequest(
      new Request("http://local/api/assistant-coach/claim", {
        method: "POST",
        headers: { cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${cookie}` },
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        async resolveAuthUserId() {
          return "fresh-user";
        },
        createProfileStore: () => store,
      }
    );
    assert.equal(httpClaim.status, 200);
    const claimBody = await httpClaim.json();
    assert.match(
      claimBody.confirmation.identifiedMoment,
      /tell them a little about myself/i
    );

    const confirm = await handleAssistantCoachConfirmRequest(
      new Request("http://local/api/assistant-coach/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(claimBody.confirmation),
      }),
      {
        async resolveAuthUserId() {
          return "fresh-user";
        },
        async loadProfile() {
          return store.profile;
        },
        async saveConfirmedProfile(profile) {
          store.profile = profile;
          return profile;
        },
      }
    );
    assert.equal(confirm.status, 200);
    const confirmBody = await confirm.json();
    assert.equal(
      confirmBody.identifiedMoment,
      claimBody.confirmation.identifiedMoment
    );
    const forgeTitle = new URL(
      confirmBody.practiceHref,
      "https://talkforge.local"
    ).searchParams.get("title");
    assert.equal(forgeTitle, confirmBody.identifiedMoment);
    void hashAnonSecret;
  });
});

describe("Friends reconnect — starting the conversation", () => {
  it("recovers the moment and a working Forge href from this conversation", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const { minted } = await seedAnonSession(repo, {
      draft: {
        evidenceLedger: [
          ev(
            "g",
            "They likely want to feel reconnected and supported by friends.",
            "communication_goal"
          ),
          ev(
            "f",
            "They report that starting the conversation is the hardest part of reconnecting with friends.",
            "communication_friction"
          ),
        ],
      },
      userMessages: [
        "Hello! I’m having a midlife crises and I don’t know how to connect with my friends",
        "Starting a conversation",
      ],
    });
    const store = profileStore(emptyLivingProfile("friends-user", "Avery"));
    const claimed = await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "friends-user",
      profiles: store,
    });
    const view = buildConfirmationView(claimed.draftProfile, {
      userMessages: claimed.userMessages,
    });
    assert.match(view.workingOn, /^You want/i);
    assert.doesNotMatch(view.workingOn, /^They\b/);
    assert.match(view.difficulty, /start/i);
    assert.doesNotMatch(view.difficulty, /^They\b/);
    assert.match(view.identifiedMoment, /start(?:ing)? a conversation with a friend/i);
    assert.equal(view.canContinue, true);
    const href = buildFirstPracticeHref(view);
    assert.equal(isConfirmedForgeHandoffHref(href), true);
    const title = new URL(href, "https://talkforge.local").searchParams.get(
      "title"
    );
    assert.equal(title, view.identifiedMoment);
    const confirm = await handleAssistantCoachConfirmRequest(
      new Request("http://local/api/assistant-coach/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(view),
      }),
      {
        async resolveAuthUserId() {
          return "friends-user";
        },
        async loadProfile() {
          return store.profile;
        },
        async saveConfirmedProfile(profile) {
          store.profile = profile;
          return profile;
        },
      }
    );
    assert.equal(confirm.status, 200);
    const body = await confirm.json();
    assert.match(body.practiceHref, /source=ac/);
    assert.match(body.identifiedMoment, /conversation with a friend/i);
  });
});

describe("Existing member with stale Living Profile history", () => {
  it("confirmed AC wife conversation is the Forge title, not board history", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const { minted } = await seedAnonSession(repo, {
      draft: {
        goals: ["Considering a career change"],
        evidenceLedger: [
          ev(
            "g2",
            "Considering a career change",
            "communication_goal"
          ),
        ],
      },
      userMessages: [
        "I’m considering a career change.",
        WIFE_MOMENT,
      ],
    });

    const member = emptyLivingProfile("returning-user", "Jordan");
    member.purposeStatement = "Lead with calm in the boardroom.";
    member.goals = ["Board presentations"];
    member.challenges = ["Executive Q&A"];
    member.evidenceLedger = [
      ev(
        "old",
        "Last quarter’s board Q&A when the CFO challenged the forecast",
        "lived_example",
        "member_statement"
      ),
    ];
    const store = profileStore(member);

    const claimed = await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "returning-user",
      profiles: store,
    });

    const mergedView = buildConfirmationView(claimed.profile);
    assert.doesNotMatch(mergedView.identifiedMoment, /board/i);

    const view = buildConfirmationView(claimed.draftProfile, {
      userMessages: claimed.userMessages,
    });
    assert.match(view.identifiedMoment, /tell my wife/i);
    assert.doesNotMatch(view.identifiedMoment, /board/i);
    assert.doesNotMatch(view.workingOn, /board/i);
    assert.equal(view.canContinue, true);

    const href = buildFirstPracticeHref(view);
    const title = new URL(href, "https://talkforge.local").searchParams.get(
      "title"
    );
    assert.match(title, /tell my wife/i);
    assert.doesNotMatch(title, /board/i);
    assert.equal(claimed.profile.purposeStatement, "Lead with calm in the boardroom.");
    assert.ok(claimed.profile.goals.includes("Board presentations"));
  });
});

describe("Handoff fail-closed", () => {
  it("topic-only confirmation cannot Continue into Forge", async () => {
    assert.equal(buildFirstPracticeHref({
      workingOn: "Considering a career change",
      difficulty: "Uncertainty",
      identifiedMoment: "Considering a career change",
      firstWork: "Talk about it",
    }), "");

    const saved = emptyLivingProfile("u", "Pat");
    const res = await handleAssistantCoachConfirmRequest(
      new Request("http://local/api/assistant-coach/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workingOn: "Considering a career change",
          identifiedMoment: "Considering a career change",
        }),
      }),
      {
        async resolveAuthUserId() {
          return "u";
        },
        async loadProfile() {
          return saved;
        },
        async saveConfirmedProfile(p) {
          return p;
        },
      }
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "identified_moment_required");
  });

  it("historical member goals are not used as the identified moment", () => {
    const profile = emptyLivingProfile("u", "Pat");
    profile.goals = ["Board presentations"];
    profile.evidenceLedger = [
      ev(
        "old",
        "Board Q&A last quarter",
        "lived_example",
        "member_statement"
      ),
    ];
    const view = buildConfirmationView(profile);
    assert.equal(view.identifiedMoment, "");
    assert.equal(view.canContinue, false);
    assert.equal(view.workingOn, "");
  });
});
