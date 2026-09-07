import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  COACH_TOPICS,
} from "../assistant-coach/coach-topics.ts";
import {
  sealAnonCookieValue,
} from "../assistant-coach/anon-cookie.ts";
import {
  hashAnonSecret,
} from "../assistant-coach/anon-secret.ts";
import {
  createMemoryAssistantCoachSessionRepository,
} from "../assistant-coach/session-repository.ts";
import {
  authorizeGuestForgeMint,
  bootstrapGuestForgePreview,
  completeGuestForgePreview,
  guestForgeTopicContext,
  listGuestForgeMessages,
  persistGuestForgeTranscript,
  readGuestForgeTranscriptForClaim,
  settleGuestForgeMint,
} from "./guest-preview.ts";
import {
  assertSameOrigin,
  resolveGuestPreviewSession,
} from "./guest-preview-http.ts";
import {
  GUEST_FORGE_MAX_DURATION_SECONDS,
  clampGuestPreviewDurationSeconds,
} from "./guest-preview-duration.ts";

async function fixture() {
  const repository = createMemoryAssistantCoachSessionRepository();
  const rawSecret = "a".repeat(64);
  const session = await repository.createSession({
    anonKeyHash: hashAnonSecret(rawSecret),
    now: new Date("2026-09-07T20:00:00.000Z"),
  });
  return { repository, rawSecret, session };
}

describe("Decision 060 guest Forge preview", () => {
  it("maps every independent Coach topic to deterministic opening context", () => {
    for (const topic of COACH_TOPICS) {
      const context = guestForgeTopicContext(topic.id);
      assert.ok(context.eventTitle.length > 0);
      assert.match(context.objective, new RegExp(topic.label.replace("/", "\\/"), "i"));
      assert.ok(context.opening.length > 20);
    }
    assert.match(guestForgeTopicContext("interview").opening, /role|interview/i);
    assert.match(
      guestForgeTopicContext("salary-negotiation").opening,
      /negotiat|outcome|ask/i
    );
    assert.match(
      guestForgeTopicContext("something-else").opening,
      /generically|conversation/i
    );
    assert.throws(() => guestForgeTopicContext("forged-topic"), /Invalid Coach topic/);
  });

  it("binds one topic and converges concurrent starts before spend", async () => {
    const { repository, session } = await fixture();
    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "interview",
      now: new Date("2026-09-07T20:01:00.000Z"),
    });
    assert.equal(unused.status, "unused");
    await assert.rejects(
      bootstrapGuestForgePreview({
        repository,
        session,
        topicId: "salary-negotiation",
      }),
      (error) => error.code === "topic_locked"
    );

    const input = {
      repository,
      session,
      topicId: "interview",
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
      now: new Date("2026-09-07T20:02:00.000Z"),
    };
    const results = await Promise.allSettled([
      authorizeGuestForgeMint(input),
      authorizeGuestForgeMint(input),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    const winner = results.find((result) => result.status === "fulfilled").value;
    assert.equal(winner.preview.status, "active");
    assert.equal(winner.preview.mintAttempts, 1);
  });

  it("allows bounded reconnect, protects transcript replay, and denies completed reuse", async () => {
    const { repository, session } = await fixture();
    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "salary-negotiation",
    });
    const first = await authorizeGuestForgeMint({
      repository,
      session,
      topicId: unused.topicId,
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
    });
    const active = await settleGuestForgeMint({
      repository,
      sessionId: session.id,
      mintLeaseId: first.mintLeaseId,
      realtimeSessionId: "rt_first",
    });
    const reconnect = await authorizeGuestForgeMint({
      repository,
      session,
      topicId: active.topicId,
      reconnectToken: active.reconnectToken,
      expectedVersion: active.version,
    });
    const reconnected = await settleGuestForgeMint({
      repository,
      sessionId: session.id,
      mintLeaseId: reconnect.mintLeaseId,
      realtimeSessionId: "rt_second",
    });
    assert.equal(reconnected.forgeSessionId, active.forgeSessionId);
    assert.equal(reconnected.mintAttempts, 2);

    const turns = [
      { role: "forge", turnIndex: 0, text: "Who are you negotiating with?" },
      { role: "founder", turnIndex: 1, text: "My manager." },
    ];
    const persisted = await persistGuestForgeTranscript({
      repository,
      session,
      topicId: reconnected.topicId,
      reconnectToken: reconnected.reconnectToken,
      expectedVersion: reconnected.version,
      replayId: "replay_1234567890",
      turns,
    });
    const replayed = await persistGuestForgeTranscript({
      repository,
      session,
      topicId: reconnected.topicId,
      reconnectToken: reconnected.reconnectToken,
      expectedVersion: reconnected.version,
      replayId: "replay_1234567890",
      turns,
    });
    assert.equal(replayed.version, persisted.version);
    assert.equal((await repository.listMessages(session.id)).length, 2);

    const completed = await completeGuestForgePreview({
      repository,
      session,
      topicId: persisted.topicId,
      reconnectToken: persisted.reconnectToken,
      expectedVersion: persisted.version,
      completionId: "complete_123456789",
    });
    assert.equal(completed.status, "completed");
    const completionReplay = await completeGuestForgePreview({
      repository,
      session,
      topicId: persisted.topicId,
      reconnectToken: persisted.reconnectToken,
      expectedVersion: persisted.version,
      completionId: "complete_123456789",
    });
    assert.equal(completionReplay.version, completed.version);
    await assert.rejects(
      authorizeGuestForgeMint({
        repository,
        session,
        topicId: completed.topicId,
        reconnectToken: completed.reconnectToken,
        expectedVersion: completed.version,
      }),
      (error) => error.code === "preview_completed"
    );
  });

  it("reserves an immutable base index and isolates legacy Assistant Coach messages", async () => {
    const { repository, session } = await fixture();
    await repository.appendMessage({
      sessionId: session.id,
      turnIndex: 0,
      role: "assistant",
      content: "Legacy discovery opening",
      modelMeta: { source: "assistant_coach_turn" },
    });
    await repository.appendMessage({
      sessionId: session.id,
      turnIndex: 3,
      role: "user",
      content: "Legacy discovery answer",
      modelMeta: { source: "assistant_coach_turn" },
    });
    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "interview",
    });
    assert.equal(unused.transcriptBaseIndex, 4);
    const started = await authorizeGuestForgeMint({
      repository,
      session,
      topicId: unused.topicId,
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
    });
    const active = await settleGuestForgeMint({
      repository,
      sessionId: session.id,
      mintLeaseId: started.mintLeaseId,
      realtimeSessionId: "rt_legacy",
    });
    await persistGuestForgeTranscript({
      repository,
      session,
      topicId: active.topicId,
      reconnectToken: active.reconnectToken,
      expectedVersion: active.version,
      replayId: "legacy_safe_replay_1",
      turns: [
        { role: "forge", turnIndex: 0, text: "Preview opening" },
        { role: "founder", turnIndex: 1, text: "Preview answer" },
      ],
    });
    const previewMessages = await listGuestForgeMessages(repository, session.id);
    assert.deepEqual(
      previewMessages.map((message) => message.turnIndex),
      [4, 5]
    );
    assert.deepEqual(
      previewMessages.map((message) => message.content),
      ["Preview opening", "Preview answer"]
    );
    assert.equal((await repository.listMessages(session.id)).length, 4);
    assert.deepEqual(
      await readGuestForgeTranscriptForClaim(
        repository,
        session.id,
        unused.transcriptBaseIndex
      ),
      [
        { role: "forge", turnIndex: 0, text: "Preview opening" },
        { role: "founder", turnIndex: 1, text: "Preview answer" },
      ]
    );
    const restored = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "interview",
    });
    assert.equal(restored.transcriptBaseIndex, 4);
  });

  it("converges a partial append on retry and rejects changed replay content", async () => {
    const { repository, session } = await fixture();
    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "handling-conflict",
    });
    const started = await authorizeGuestForgeMint({
      repository,
      session,
      topicId: unused.topicId,
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
    });
    const active = await settleGuestForgeMint({
      repository,
      sessionId: session.id,
      mintLeaseId: started.mintLeaseId,
      realtimeSessionId: "rt_partial",
    });
    let appendCalls = 0;
    let failOnce = true;
    const flakyRepository = {
      ...repository,
      async appendMessage(message) {
        appendCalls += 1;
        if (failOnce && appendCalls === 2) {
          failOnce = false;
          throw new Error("injected partial append failure");
        }
        return repository.appendMessage(message);
      },
    };
    const turns = [
      { role: "forge", turnIndex: 0, text: "What is at stake?" },
      { role: "founder", turnIndex: 1, text: "Trust with my colleague." },
    ];
    const request = {
      repository: flakyRepository,
      session,
      topicId: active.topicId,
      reconnectToken: active.reconnectToken,
      expectedVersion: active.version,
      replayId: "partial_retry_replay",
      turns,
    };
    await assert.rejects(
      persistGuestForgeTranscript(request),
      /injected partial append failure/
    );
    assert.equal((await listGuestForgeMessages(repository, session.id)).length, 1);
    const converged = await persistGuestForgeTranscript(request);
    assert.equal((await listGuestForgeMessages(repository, session.id)).length, 2);
    assert.equal(converged.lastTranscriptReplayId, request.replayId);

    await assert.rejects(
      persistGuestForgeTranscript({
        ...request,
        turns: [
          { role: "forge", turnIndex: 0, text: "Changed replay content" },
        ],
      }),
      (error) =>
        error.code === "invalid_payload" &&
        /different content/.test(error.message)
    );
  });

  it("clamps the server-supplied guest duration to at most 15 minutes", () => {
    assert.equal(
      clampGuestPreviewDurationSeconds(60_000),
      GUEST_FORGE_MAX_DURATION_SECONDS
    );
    assert.equal(clampGuestPreviewDurationSeconds(420.9), 420);
    assert.equal(
      clampGuestPreviewDurationSeconds(undefined),
      GUEST_FORGE_MAX_DURATION_SECONDS
    );
    assert.equal(clampGuestPreviewDurationSeconds(1), 60);
  });

  it("validates signed cookies, expiry, origin, role and payload bounds", async () => {
    const { repository, rawSecret, session } = await fixture();
    const secret = "cookie-secret-".padEnd(40, "x");
    const cookie = sealAnonCookieValue(rawSecret, secret);
    const request = new Request("https://talkforge.test/api/forge/preview/complete", {
      method: "POST",
      headers: {
        origin: "https://talkforge.test",
        cookie: `tf_ac_anon=${cookie}`,
      },
    });
    assertSameOrigin(request);
    assert.equal(
      (await resolveGuestPreviewSession({
        request,
        repository,
        cookieSecret: secret,
        now: new Date("2026-09-07T20:02:00.000Z"),
      })).id,
      session.id
    );
    assert.throws(
      () =>
        assertSameOrigin(
          new Request("https://talkforge.test/api/forge/preview", {
            method: "POST",
            headers: { origin: "https://evil.test" },
          })
        ),
      (error) => error.status === 403
    );
    await assert.rejects(
      resolveGuestPreviewSession({
        request: new Request("https://talkforge.test/api/forge/preview", {
          headers: { cookie: `tf_ac_anon=${cookie}tampered` },
        }),
        repository,
        cookieSecret: secret,
      }),
      (error) => error.status === 401
    );

    const unused = await bootstrapGuestForgePreview({
      repository,
      session,
      topicId: "interview",
    });
    const started = await authorizeGuestForgeMint({
      repository,
      session,
      topicId: unused.topicId,
      reconnectToken: unused.reconnectToken,
      expectedVersion: unused.version,
    });
    const active = await settleGuestForgeMint({
      repository,
      sessionId: session.id,
      mintLeaseId: started.mintLeaseId,
      realtimeSessionId: "rt",
    });
    await assert.rejects(
      persistGuestForgeTranscript({
        repository,
        session,
        topicId: active.topicId,
        reconnectToken: active.reconnectToken,
        expectedVersion: active.version,
        replayId: "replay_1234567890",
        turns: [{ role: "system", turnIndex: 0, text: "inject" }],
      }),
      (error) => error.code === "invalid_payload"
    );
  });

  it("keeps the authenticated Realtime/readiness branch and isolates guest writes", () => {
    const realtimeRoute = readFileSync(
      new URL("../../app/api/realtime/session/route.ts", import.meta.url),
      "utf8"
    );
    const arena = readFileSync(
      new URL("../../app/components/VoiceArena.tsx", import.meta.url),
      "utf8"
    );
    const guestService = readFileSync(
      new URL("./guest-preview.ts", import.meta.url),
      "utf8"
    );
    const bootstrapRoute = readFileSync(
      new URL("../../app/api/forge/preview/route.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      realtimeRoute.indexOf("handleGuestPreviewRealtime(req, body)") <
        realtimeRoute.indexOf("const gate = await requireApiUser()")
    );
    assert.match(realtimeRoute, /evaluatePracticeRouteAccess\(\)/);
    assert.match(realtimeRoute, /evaluatePracticeEntitlement\(/);
    assert.match(realtimeRoute, /loadCoachPromptContextForUser\(/);
    assert.match(arena, /if \(!isGuestPreview\) \{[\s\S]*createPracticeSession\(/);
    assert.match(arena, /if \(isGuestPreview && guestPreview\)/);
    assert.match(arena, /guestDurationTimerRef[\s\S]*handleStop\(\)/);
    assert.ok(
      bootstrapRoute.indexOf("guest-forge-bootstrap:ip:") <
        bootstrapRoute.indexOf(
          "const ensured = await ensureAnonAssistantCoachSession"
        )
    );
    assert.doesNotMatch(guestService, /living_profiles|ensurePersistedLivingProfile/);
    assert.doesNotMatch(
      guestService,
      /\.from\(["']guest_|signInAnonymously|member_practice_profile/
    );
  });
});
