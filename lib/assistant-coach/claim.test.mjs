/**
 * Claim merge + ownership attach. Preserves #153 conversion and OWN-001 purpose.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  sealAnonCookieValue,
} from "./anon-cookie.ts";
import {
  AssistantCoachClaimError,
  claimAssistantCoachSession,
} from "./claim.ts";
import { mergeDraftIntoMemberLivingProfile } from "./claim-merge.ts";
import { handleAssistantCoachClaimRequest } from "./http-claim.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { emptyLivingProfile } from "../system1/profile.ts";
import { addProfileEvidence } from "../system1/profile-evidence.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";
const NOW = "2026-08-20T12:00:00.000Z";

function evidence(id, text, category) {
  return addProfileEvidence([], {
    id,
    userId: "anon",
    sourceType: "assistant_coach",
    sourceId: id,
    observedAt: NOW,
    text,
    category,
    confidence: "high",
  })[0];
}

describe("Claim merge (F.2)", () => {
  it("appends draft evidence, ignores draft purpose, keeps member purpose", () => {
    const member = emptyLivingProfile("user_1", "Alex");
    member.purposeStatement = "Speak with courage in rooms that matter.";
    member.goals = ["Lead the staff meeting"];
    const draft = emptyLivingProfile("anon:s1", "");
    draft.purposeStatement = "I am a confident executive";
    draft.evidenceLedger = [
      evidence(
        "ev1",
        "Has a job interview coming up and wants to be prepared",
        "communication_goal"
      ),
      evidence(
        "ev2",
        "Blanks when asked tell me about yourself",
        "communication_friction"
      ),
    ];
    draft.goals = ["Job interview preparation"];

    const merged = mergeDraftIntoMemberLivingProfile({
      member,
      draft,
      sessionId: "s1",
      now: new Date(NOW),
    });

    assert.equal(
      merged.purposeStatement,
      "Speak with courage in rooms that matter."
    );
    assert.equal(merged.personalPrinciples, member.personalPrinciples);
    assert.ok(
      merged.evidenceLedger.some((e) => /tell me about yourself/i.test(e.text))
    );
    assert.ok(merged.goals.includes("Lead the staff meeting"));
    assert.ok(merged.goals.includes("Job interview preparation"));
    assert.equal(merged.userId, "user_1");
  });

  it("leaves purpose empty when member has none — never copies draft purpose", () => {
    const member = emptyLivingProfile("user_2", "Sam");
    const draft = emptyLivingProfile("anon:s2", "");
    draft.purposeStatement = "Invented purpose from Coach";
    const merged = mergeDraftIntoMemberLivingProfile({
      member,
      draft,
      sessionId: "s2",
      now: new Date(NOW),
    });
    assert.equal(merged.purposeStatement, "");
  });
});

describe("claimAssistantCoachSession", () => {
  it("claims gated anon session onto member LP and is idempotent", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    await repo.saveDraft({
      sessionId: minted.session.id,
      version: 2,
      profileJson: {
        purposeStatement: "should be ignored",
        evidenceLedger: [
          evidence(
            "evg",
            "Job interview coming up and wants to feel prepared",
            "communication_goal"
          ),
          evidence(
            "evf",
            "Brain fog hits on tell me about yourself",
            "lived_example"
          ),
        ],
      },
    });
    await repo.updateSessionFlags(minted.session.id, {
      status: "gated",
      hasExperiencedValue: true,
    });

    const store = {
      profile: emptyLivingProfile("user_claim", "Jordan"),
      complete: false,
      async loadOrCreate() {
        return this.profile;
      },
      async saveMerged(next) {
        this.profile = next;
        return next;
      },
      async markOnboardingComplete() {
        this.complete = true;
      },
    };

    const first = await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "user_claim",
      profiles: store,
    });
    assert.equal(first.session.status, "claimed");
    assert.equal(first.session.userId, "user_claim");
    assert.equal(first.alreadyClaimed, false);
    assert.equal(first.profile.purposeStatement, "");
    assert.equal(store.complete, true);
    assert.ok(
      first.profile.evidenceLedger.some((e) => /tell me about yourself/i.test(e.text))
    );

    const second = await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "user_claim",
      profiles: store,
    });
    assert.equal(second.alreadyClaimed, true);
    assert.equal(second.session.id, first.session.id);
  });

  it("rejects claim by a different user", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    const store = {
      async loadOrCreate(userId) {
        return emptyLivingProfile(userId, "");
      },
      async saveMerged(p) {
        return p;
      },
      async markOnboardingComplete() {},
    };
    await claimAssistantCoachSession({
      repository: repo,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "owner",
      profiles: store,
    });
    await assert.rejects(
      () =>
        claimAssistantCoachSession({
          repository: repo,
          anonKeyHash: minted.session.anonKeyHash,
          userId: "other",
          profiles: store,
        }),
      (err) => err instanceof AssistantCoachClaimError && err.status === 409
    );
  });
});

describe("HTTP claim", () => {
  it("401 without auth; 200 with cookie + auth", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
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
      profileJson: {
        evidenceLedger: [
          evidence(
            "evh",
            "Upcoming interview and wants help preparing",
            "communication_goal"
          ),
        ],
      },
    });

    const profiles = {
      profile: emptyLivingProfile("auth-user", "Pat"),
      async loadOrCreate() {
        return this.profile;
      },
      async saveMerged(next) {
        this.profile = next;
        return next;
      },
      async markOnboardingComplete() {},
    };

    const deps = {
      adminConfigured: () => true,
      requireCookieSecret: () => TEST_SECRET,
      createRepository: () => repo,
      async resolveAuthUserId() {
        return null;
      },
      createProfileStore: () => profiles,
    };

    const unauth = await handleAssistantCoachClaimRequest(
      new Request("http://local/api/assistant-coach/claim", { method: "POST" }),
      deps
    );
    assert.equal(unauth.status, 401);

    deps.resolveAuthUserId = async () => "auth-user";
    const cookie = sealAnonCookieValue(rawSecret, TEST_SECRET);
    const authed = await handleAssistantCoachClaimRequest(
      new Request("http://local/api/assistant-coach/claim", {
        method: "POST",
        headers: { cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${cookie}` },
      }),
      deps
    );
    assert.equal(authed.status, 200);
    const body = await authed.json();
    assert.equal(body.session.status, "claimed");
    assert.equal(typeof body.confirmation.workingOn, "string");
    void hashAnonSecret;
  });
});
