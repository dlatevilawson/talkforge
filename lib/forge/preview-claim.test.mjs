import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { sealAnonCookieValue } from "../assistant-coach/anon-cookie.ts";
import { hashAnonSecret } from "../assistant-coach/anon-secret.ts";
import {
  createMemoryAssistantCoachSessionRepository,
} from "../assistant-coach/session-repository.ts";
import {
  authorizeGuestForgeMint,
  bootstrapGuestForgePreview,
  completeGuestForgePreview,
  persistGuestForgeTranscript,
  readGuestForgePreview,
  settleGuestForgeMint,
} from "./guest-preview.ts";
import { handleGuestPreviewClaimRequest } from "./preview-claim-http.ts";
import {
  authenticatedPracticePath,
  claimGuestForgePreview,
  memberForgeTransitionPath,
  previewClaimLoginPath,
  previewClaimReturnPath,
} from "./preview-claim.ts";

const START = new Date("2026-09-07T20:00:00.000Z");

async function completedFixture() {
  const repository = createMemoryAssistantCoachSessionRepository();
  const rawSecret = "p".repeat(64);
  const session = await repository.createSession({
    anonKeyHash: hashAnonSecret(rawSecret),
    now: START,
  });
  await repository.appendMessage({
    sessionId: session.id,
    turnIndex: 0,
    role: "assistant",
    content: "Old Assistant Coach discovery",
    modelMeta: { source: "assistant_coach_turn" },
  });
  const preview = await bootstrapGuestForgePreview({
    repository,
    session,
    topicId: "interview",
    now: START,
  });
  const authorized = await authorizeGuestForgeMint({
    repository,
    session,
    topicId: preview.topicId,
    reconnectToken: preview.reconnectToken,
    expectedVersion: preview.version,
    now: START,
  });
  const active = await settleGuestForgeMint({
    repository,
    sessionId: session.id,
    mintLeaseId: authorized.mintLeaseId,
    realtimeSessionId: "rt_claim",
    now: START,
  });
  const persisted = await persistGuestForgeTranscript({
    repository,
    session,
    topicId: active.topicId,
    reconnectToken: active.reconnectToken,
    expectedVersion: active.version,
    replayId: "claim_replay_12345",
    turns: [
      { role: "forge", turnIndex: 0, text: "Tell me about yourself." },
      { role: "founder", turnIndex: 1, text: "I build useful systems." },
    ],
    now: START,
  });
  await completeGuestForgePreview({
    repository,
    session,
    topicId: persisted.topicId,
    reconnectToken: persisted.reconnectToken,
    expectedVersion: persisted.version,
    completionId: "claim_complete_123",
    now: START,
  });
  return { repository, rawSecret, session };
}

describe("Decision 060 guest preview claim", () => {
  it("binds the completed row and only the namespaced preview transcript", async () => {
    const { repository, rawSecret, session } = await completedFixture();
    const result = await claimGuestForgePreview({
      repository,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "user-one",
      expectedTopicId: "interview",
      now: START,
    });
    assert.equal(result.session.userId, "user-one");
    assert.equal(result.session.status, "claimed");
    assert.equal(result.topicId, "interview");
    assert.deepEqual(
      result.transcript.map((turn) => turn.text),
      ["Tell me about yourself.", "I build useful systems."]
    );
    assert.doesNotMatch(
      result.transcript.map((turn) => turn.text).join(" "),
      /Old Assistant Coach/
    );
    const draft = await repository.getDraft(session.id);
    assert.equal(readGuestForgePreview(draft).status, "claimed");
  });

  it("is idempotent and converges concurrent same-user claims", async () => {
    const { repository, rawSecret } = await completedFixture();
    const request = {
      repository,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "user-one",
      expectedTopicId: "interview",
      now: START,
    };
    const concurrent = await Promise.all([
      claimGuestForgePreview(request),
      claimGuestForgePreview(request),
    ]);
    assert.equal(concurrent[0].session.userId, "user-one");
    assert.equal(concurrent[1].session.userId, "user-one");
    const replay = await claimGuestForgePreview(request);
    assert.equal(replay.alreadyClaimed, true);
    assert.equal(replay.session.id, concurrent[0].session.id);
  });

  it("recovers an ownership-success/marker-failure partial claim", async () => {
    const { repository, rawSecret, session } = await completedFixture();
    let failMarkerOnce = true;
    const flaky = {
      ...repository,
      async compareAndSwapDraft(...args) {
        if (failMarkerOnce) {
          failMarkerOnce = false;
          throw new Error("injected marker failure");
        }
        return repository.compareAndSwapDraft(...args);
      },
    };
    const input = {
      repository: flaky,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "user-one",
      expectedTopicId: "interview",
      now: START,
    };
    await assert.rejects(claimGuestForgePreview(input), /injected marker failure/);
    assert.equal((await repository.getSession(session.id)).userId, "user-one");
    const recovered = await claimGuestForgePreview(input);
    assert.equal(recovered.alreadyClaimed, true);
    assert.equal(
      readGuestForgePreview(await repository.getDraft(session.id)).status,
      "claimed"
    );
  });

  it("rejects unused, active, expired, other-user, topic, and cross-device claims", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const rawSecret = "u".repeat(64);
    const session = await repository.createSession({
      anonKeyHash: hashAnonSecret(rawSecret),
      now: START,
    });
    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "interview",
      now: START,
    });
    const input = {
      repository,
      anonKeyHash: hashAnonSecret(rawSecret),
      userId: "user-one",
      expectedTopicId: "interview",
      now: START,
    };
    await assert.rejects(
      claimGuestForgePreview(input),
      (error) => error.code === "preview_incomplete"
    );
    await authorizeGuestForgeMint({
      repository,
      session,
      topicId: unused.topicId,
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
      now: START,
    });
    await assert.rejects(
      claimGuestForgePreview(input),
      (error) => error.code === "preview_incomplete"
    );

    const complete = await completedFixture();
    await assert.rejects(
      claimGuestForgePreview({
        ...input,
        repository: complete.repository,
        anonKeyHash: null,
      }),
      (error) => error.code === "preview_required"
    );
    await assert.rejects(
      claimGuestForgePreview({
        ...input,
        repository: complete.repository,
        anonKeyHash: hashAnonSecret(complete.rawSecret),
        expectedTopicId: "salary-negotiation",
      }),
      (error) => error.code === "topic_mismatch"
    );
    await assert.rejects(
      claimGuestForgePreview({
        ...input,
        repository: complete.repository,
        anonKeyHash: hashAnonSecret(complete.rawSecret),
        now: new Date("2026-10-01T00:00:00.000Z"),
      }),
      (error) => error.code === "preview_expired"
    );
    await claimGuestForgePreview({
      ...input,
      repository: complete.repository,
      anonKeyHash: hashAnonSecret(complete.rawSecret),
    });
    await assert.rejects(
      claimGuestForgePreview({
        ...input,
        repository: complete.repository,
        anonKeyHash: hashAnonSecret(complete.rawSecret),
        userId: "user-two",
      }),
      (error) => error.code === "claim_conflict"
    );
  });

  it("requires auth and same origin at the route boundary", async () => {
    const { repository, rawSecret } = await completedFixture();
    const cookieSecret = "claim-cookie-secret".padEnd(40, "x");
    const cookie = sealAnonCookieValue(rawSecret, cookieSecret);
    const deps = {
      adminConfigured: () => true,
      requireCookieSecret: () => cookieSecret,
      createRepository: () => repository,
      resolveAuthUserId: async () => null,
    };
    const request = new Request(
      "https://talkforge.test/api/forge/preview/claim",
      {
        method: "POST",
        headers: {
          origin: "https://talkforge.test",
          host: "talkforge.test",
          cookie: `tf_ac_anon=${cookie}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ topic: "interview" }),
      }
    );
    assert.equal((await handleGuestPreviewClaimRequest(request, deps)).status, 401);
    const crossOrigin = new Request(request, {
      headers: { ...Object.fromEntries(request.headers), origin: "https://evil.test" },
    });
    assert.equal(
      (await handleGuestPreviewClaimRequest(crossOrigin, deps)).status,
      403
    );
  });

  it("returns claim metadata without returning private transcript content", async () => {
    const { repository, rawSecret } = await completedFixture();
    const cookieSecret = "claim-response-secret".padEnd(40, "x");
    const cookie = sealAnonCookieValue(rawSecret, cookieSecret);
    const response = await handleGuestPreviewClaimRequest(
      new Request("https://talkforge.test/api/forge/preview/claim", {
        method: "POST",
        headers: {
          origin: "https://talkforge.test",
          host: "talkforge.test",
          cookie: `tf_ac_anon=${cookie}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ topic: "interview" }),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => cookieSecret,
        createRepository: () => repository,
        resolveAuthUserId: async () => "user-one",
      }
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(Object.keys(body.claim).sort(), [
      "alreadyClaimed",
      "sessionId",
      "status",
      "topic",
      "transcriptTurnCount",
    ]);
    assert.equal(body.claim.transcriptTurnCount, 2);
    assert.doesNotMatch(JSON.stringify(body), /Tell me|useful systems|transcript":/);
  });

  it("constructs allowlisted return paths carrying only an approved topic", () => {
    assert.equal(
      previewClaimReturnPath("handling-conflict"),
      "/forge/preview/claim?topic=handling-conflict"
    );
    assert.equal(
      memberForgeTransitionPath("handling-conflict"),
      "/forge?topic=handling-conflict&start=1"
    );
    assert.equal(
      authenticatedPracticePath("handling-conflict"),
      "/app/practice?topic=handling-conflict&start=1"
    );
    assert.equal(previewClaimReturnPath("//evil.test"), "/coach");
    assert.equal(
      previewClaimLoginPath("handling-conflict"),
      "/login?next=%2Fforge%2Fpreview%2Fclaim%3Ftopic%3Dhandling-conflict"
    );
    assert.equal(memberForgeTransitionPath("unknown"), "/app");
    assert.equal(authenticatedPracticePath("unknown"), "/app");
    const client = readFileSync(
      new URL(
        "../../app/forge/preview/claim/PreviewClaimClient.tsx",
        import.meta.url
      ),
      "utf8"
    );
    assert.match(client, /router\.replace\(memberForgeTransitionPath\(topicId\)\)/);
  });

  it("bypasses anonymous preview for authenticated /forge requests", () => {
    const page = readFileSync(
      new URL("../../app/forge/page.tsx", import.meta.url),
      "utf8"
    );
    assert.match(page, /supabase\.auth\.getUser\(\)/);
    assert.match(page, /if \(user\) redirect\(authenticatedPracticePath\(topic\.id\)\)/);
    assert.ok(
      page.indexOf("coachTopicById(topicId)") <
        page.indexOf("createServerSupabaseClient()")
    );
    assert.ok(
      page.indexOf("if (user) redirect") <
        page.indexOf("<ForgePreviewClient")
    );
  });

  it("requires auth on the claim page and preserves only the validated topic", () => {
    const page = readFileSync(
      new URL(
        "../../app/forge/preview/claim/page.tsx",
        import.meta.url
      ),
      "utf8"
    );
    assert.match(page, /supabase\.auth\.getUser\(\)/);
    assert.match(page, /if \(!user\)/);
    assert.match(page, /redirect\(previewClaimLoginPath\(topic\.id\)\)/);
    assert.ok(
      page.indexOf("coachTopicById(rawTopic)") <
        page.indexOf("createServerSupabaseClient()")
    );
  });

  it("does not invoke the retired claim or write identity/profile storage", () => {
    const service = readFileSync(
      new URL("./preview-claim.ts", import.meta.url),
      "utf8"
    );
    const route = readFileSync(
      new URL("../../app/api/forge/preview/claim/route.ts", import.meta.url),
      "utf8"
    );
    const combined = `${service}\n${route}`;
    assert.doesNotMatch(combined, /claimAssistantCoachSession|assistant-coach\/claim/);
    assert.doesNotMatch(
      combined,
      /living_profiles|evidence_ledger|profile_insights|member_practice_profile/
    );
  });
});
