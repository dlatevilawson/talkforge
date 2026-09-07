import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  sealAnonCookieValue,
} from "./anon-cookie.ts";
import { handleAssistantCoachProfileRequest } from "./http-profile.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";

const COOKIE_SECRET = "test-assistant-coach-cookie-secret-32b!";
const RAW_SECRET = "a".repeat(43);
const NOW = new Date("2026-09-07T06:00:00.000Z");
const selection = {
  topics: [
    { id: "job_interview", customText: null },
    { id: "something_else", customText: "A board introduction" },
  ],
  audiences: ["recruiter_hr", "manager_boss"],
  pattern: "ramble",
  urgency: "this_week",
};

function request(body = { selection }, cookie = sealedCookie()) {
  return new Request("http://local/api/assistant-coach/profile", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${cookie}`,
    },
    body: JSON.stringify(body),
  });
}

function sealedCookie() {
  return sealAnonCookieValue(RAW_SECRET, COOKIE_SECRET);
}

async function setup(options = {}) {
  const repository = createMemoryAssistantCoachSessionRepository();
  const session = await repository.createSession({
    anonKeyHash: hashAnonSecret(RAW_SECRET),
    now: options.sessionNow ?? NOW,
    ttlDays: options.ttlDays,
    profileJson: { untouched: { value: true } },
  });
  return {
    repository,
    session,
    deps: {
      adminConfigured: () => true,
      requireCookieSecret: () => COOKIE_SECRET,
      createRepository: () => repository,
      now: () => options.now ?? NOW,
    },
  };
}

describe("Coach wizard profile API", () => {
  it("verifies and persists only memberPracticeProfile in the existing draft", async () => {
    const { repository, session, deps } = await setup();
    const response = await handleAssistantCoachProfileRequest(request(), deps);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.projection, {
      mappingVersion: 1,
      focusAreas: {
        topics: ["Job interview", "A board introduction"],
        audiences: ["Recruiter/HR", "Manager/boss"],
        urgency: "This week",
      },
      patternTemplate:
        "You tend to ramble and lose the thread when the pressure rises.",
      initialForgeTarget: "Practice a job interview with Recruiter/HR.",
    });
    assert.equal(body.profile.verifiedAt, NOW.toISOString());
    assert.equal(body.profile.updatedAt, NOW.toISOString());
    assert.deepEqual(body.profile.provenance, {
      kind: "member_declared",
      source: "coach_card_wizard",
      sourceSessionId: session.id,
    });

    const draft = await repository.getDraft(session.id);
    assert.deepEqual(draft.profileJson.untouched, { value: true });
    assert.deepEqual(draft.profileJson.memberPracticeProfile, body.profile);
    assert.equal(draft.version, 2);
    assert.deepEqual(await repository.listMessages(session.id), []);
  });

  it("rejects a missing or tampered signed cookie", async () => {
    const { deps } = await setup();
    const missing = new Request("http://local/api/assistant-coach/profile", {
      method: "POST",
      body: JSON.stringify({ selection }),
    });
    assert.equal(
      (await handleAssistantCoachProfileRequest(missing, deps)).status,
      401
    );
    assert.equal(
      (
        await handleAssistantCoachProfileRequest(
          request({ selection }, `${sealedCookie()}tampered`),
          deps
        )
      ).status,
      401
    );
  });

  it("rejects expired sessions and marks them expired", async () => {
    const { repository, session, deps } = await setup({
      sessionNow: new Date("2026-08-01T00:00:00.000Z"),
      ttlDays: 1,
      now: NOW,
    });
    const response = await handleAssistantCoachProfileRequest(request(), deps);
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, "session_expired");
    assert.equal((await repository.getSession(session.id)).status, "expired");
  });

  it("requires the paired draft and leaves invalid selections unsaved", async () => {
    const { repository, session, deps } = await setup();
    const before = await repository.getDraft(session.id);
    const invalid = await handleAssistantCoachProfileRequest(
      request({ selection: { ...selection, topics: [] } }),
      deps
    );
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, "invalid_selection");
    assert.deepEqual(await repository.getDraft(session.id), before);

    const withoutDraft = {
      ...repository,
      async getDraft() {
        return null;
      },
    };
    const missing = await handleAssistantCoachProfileRequest(request(), {
      ...deps,
      createRepository: () => withoutDraft,
    });
    assert.equal(missing.status, 409);
    assert.equal((await missing.json()).code, "draft_missing");
  });
});
