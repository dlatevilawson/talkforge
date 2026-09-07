import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { activateAssistantCoachProfile } from "./activation.ts";
import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
import { createVerifiedMemberPracticeProfile } from "./practice-profile.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { emptyLivingProfile } from "../system1/profile.ts";
import { COACH_WIZARD_PRACTICE_DESTINATION } from "./forge-handoff.ts";

const NOW = new Date("2026-09-07T07:00:00.000Z");
const selection = {
  topics: [{ id: "job_interview", customText: null }],
  audiences: ["recruiter_hr"],
  pattern: "freeze",
  urgency: "today",
};

async function fixture(userId = "member_1") {
  const repository = createMemoryAssistantCoachSessionRepository();
  const rawSecret = generateAnonSecret();
  const session = await repository.createSession({
    anonKeyHash: hashAnonSecret(rawSecret),
    now: NOW,
  });
  const draft = await repository.getDraft(session.id);
  await repository.saveDraft({
    sessionId: session.id,
    version: draft.version + 1,
    expectedVersion: draft.version,
    profileJson: {
      memberPracticeProfile: createVerifiedMemberPracticeProfile({
        selection,
        sourceSessionId: session.id,
        now: NOW,
      }),
    },
  });
  const store = {
    profile: emptyLivingProfile(userId, "Member"),
    saves: 0,
    completed: false,
    async loadOrCreate() {
      return structuredClone(this.profile);
    },
    async saveIfVersion(next, expectedVersion) {
      if (this.profile.version !== expectedVersion) return null;
      this.saves += 1;
      this.profile = { ...next, version: expectedVersion + 1 };
      return structuredClone(this.profile);
    },
    async markOnboardingComplete() {
      this.completed = true;
    },
  };
  return { repository, rawSecret, session, store };
}

describe("Decision 060 Coach activation", () => {
  it("claims a verified guest draft and retries idempotently for the same member", async () => {
    const { repository, rawSecret, session, store } = await fixture();
    const first = await activateAssistantCoachProfile({
      repository,
      profiles: store,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "member_1",
      now: NOW,
    });
    assert.equal(first.destination, COACH_WIZARD_PRACTICE_DESTINATION);
    assert.equal(first.profile.memberPracticeProfile.pattern, "freeze");
    assert.equal(first.profile.provenance[0].sourceKind, "member_declared");
    assert.equal((await repository.getSession(session.id)).userId, "member_1");
    assert.equal(store.completed, true);

    const retry = await activateAssistantCoachProfile({
      repository,
      profiles: store,
      anonKeyHash: null,
      userId: "member_1",
      now: NOW,
    });
    assert.equal(retry.alreadyActive, true);
    assert.equal(store.saves, 1);
  });

  it("preserves an existing verified member profile", async () => {
    const { repository, rawSecret, store } = await fixture();
    const existing = createVerifiedMemberPracticeProfile({
      selection: {
        topics: [{ id: "setting_a_boundary", customText: null }],
        audiences: ["family_friend"],
        pattern: "ramble",
        urgency: "this_week",
      },
      sourceSessionId: "older",
      now: new Date("2026-09-01T00:00:00.000Z"),
    });
    store.profile.memberPracticeProfile = existing;
    const result = await activateAssistantCoachProfile({
      repository,
      profiles: store,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "member_1",
      now: NOW,
    });
    assert.deepEqual(result.profile.memberPracticeProfile, existing);
    assert.equal(store.saves, 0);
  });

  it("reloads after an optimistic conflict and rejects another member without disclosure", async () => {
    const { repository, rawSecret, store } = await fixture();
    const originalSave = store.saveIfVersion.bind(store);
    let conflict = true;
    store.saveIfVersion = async (next, version) => {
      if (conflict) {
        conflict = false;
        return null;
      }
      return originalSave(next, version);
    };
    await activateAssistantCoachProfile({
      repository,
      profiles: store,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "member_1",
      now: NOW,
    });
    assert.equal(store.saves, 1);

    await assert.rejects(
      () =>
        activateAssistantCoachProfile({
          repository,
          profiles: store,
          anonKeyHash: hashAnonSecret(rawSecret),
          userId: "member_2",
          now: NOW,
        }),
      (error) => {
        assert.equal(error.code, "activation_required");
        assert.doesNotMatch(error.message, /member_1|belongs|owner/i);
        return true;
      }
    );
  });
});
