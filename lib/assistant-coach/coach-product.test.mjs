import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  COACH_PRODUCT_NAME,
} from "./coach-copy.ts";
import { COACH_TOPICS } from "./coach-topics.ts";
import { generateAnonSecret } from "./anon-secret.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import {
  authorizeGuestForgeMint,
  bootstrapGuestForgePreview,
  completeGuestForgePreview,
  persistGuestForgeTranscript,
} from "../forge/guest-preview.ts";
import { claimGuestForgePreview } from "../forge/preview-claim.ts";
import {
  GUEST_PREVIEW_COMPLETE_BODY,
  GUEST_PREVIEW_COMPLETE_HEADLINE,
  GUEST_PREVIEW_CREATE_ACCOUNT_CTA,
  GUEST_PREVIEW_DISMISSED_BODY,
  GUEST_PREVIEW_GET_STARTED_CTA,
  GUEST_PREVIEW_MAYBE_LATER_CTA,
  GUEST_PREVIEW_SIGN_IN_CTA,
} from "../forge/post-session-copy.ts";
import { entitlementFromSessionCount } from "../billing/access.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const secret = "test-assistant-coach-cookie-secret-32b!";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function shippingFiles(directory) {
  const output = [];
  for (const entry of readdirSync(join(root, directory))) {
    if (entry === "debug") continue;
    const absolute = join(root, directory, entry);
    if (statSync(absolute).isDirectory()) {
      output.push(...shippingFiles(relative(root, absolute)));
    } else if (
      /\.(?:ts|tsx|mjs|json)$/.test(entry) &&
      !entry.includes(".test.")
    ) {
      output.push(relative(root, absolute));
    }
  }
  return output;
}

describe("Decision 060 final Coach contract", () => {
  it("renders the exact shared-card grid from an independent catalog", () => {
    assert.equal(COACH_PRODUCT_NAME, "Coach");
    assert.deepEqual(
      COACH_TOPICS.map(({ label }) => label),
      [
        "Interview",
        "Salary negotiation",
        "Difficult feedback",
        "Setting a boundary",
        "Pitch / Presentation",
        "Handling conflict",
        "Something else",
      ]
    );
    const coach = read("app/coach/AssistantCoachClient.tsx");
    const picker = read("app/components/TrainingFocusPicker.tsx");
    assert.match(coach, /import TopicCard from "@\/app\/components\/TopicCard"/);
    assert.match(coach, /COACH_TOPICS\.map/);
    assert.match(picker, /TRAINING_FOCUS_OPTIONS\.map/);
    assert.doesNotMatch(coach, /TRAINING_FOCUS_OPTIONS/);
    assert.doesNotMatch(picker, /COACH_TOPICS/);
  });

  it("routes a card immediately to Forge without discovery or auth", () => {
    const coach = read("app/coach/AssistantCoachClient.tsx");
    assert.match(
      coach,
      /router\.push\(`\/forge\?topic=\$\{encodeURIComponent\(topic\.id\)\}`\)/
    );
    assert.doesNotMatch(coach, /fetch\(|form|textarea|signup|login/i);
  });

  it("initializes one guest preview and enforces its one-use lifecycle", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    const bootstrapped = await bootstrapGuestForgePreview({
      repository,
      session: minted.session,
      topicId: "interview",
    });
    const authorized = await authorizeGuestForgeMint({
      repository,
      session: minted.session,
      topicId: "interview",
      reconnectToken: bootstrapped.reconnectToken,
      expectedVersion: bootstrapped.version,
    });
    const completed = await completeGuestForgePreview({
      repository,
      session: minted.session,
      topicId: "interview",
      reconnectToken: bootstrapped.reconnectToken,
      expectedVersion: authorized.preview.version,
      completionId: "completion_id_123456",
    });
    assert.equal(completed.status, "completed");
    await assert.rejects(
      () =>
        authorizeGuestForgeMint({
          repository,
          session: minted.session,
          topicId: "interview",
          reconnectToken: bootstrapped.reconnectToken,
          expectedVersion: completed.version,
        }),
      (error) => error?.code === "preview_completed"
    );
  });

  it("claims only the source-filtered, validated preview transcript", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    await repository.appendMessage({
      sessionId: minted.session.id,
      turnIndex: 0,
      role: "user",
      content: "legacy unrelated text",
      modelMeta: { source: "retired" },
    });
    const preview = await bootstrapGuestForgePreview({
      repository,
      session: minted.session,
      topicId: "handling-conflict",
    });
    const active = await authorizeGuestForgeMint({
      repository,
      session: minted.session,
      topicId: preview.topicId,
      reconnectToken: preview.reconnectToken,
      expectedVersion: preview.version,
    });
    const persisted = await persistGuestForgeTranscript({
      repository,
      session: minted.session,
      topicId: preview.topicId,
      reconnectToken: preview.reconnectToken,
      expectedVersion: active.preview.version,
      replayId: "transcript_id_123456",
      turns: [
        { role: "founder", text: "I need to stay calm.", turnIndex: 0 },
        { role: "forge", text: "Try the opening.", turnIndex: 1 },
      ],
    });
    await completeGuestForgePreview({
      repository,
      session: minted.session,
      topicId: preview.topicId,
      reconnectToken: preview.reconnectToken,
      expectedVersion: persisted.version,
      completionId: "completion_id_654321",
    });
    const claimed = await claimGuestForgePreview({
      repository,
      anonKeyHash: minted.session.anonKeyHash,
      userId: "member_1",
      expectedTopicId: preview.topicId,
    });
    assert.deepEqual(
      claimed.transcript.map(({ role, text }) => ({ role, text })),
      [
        { role: "founder", text: "I need to stay calm." },
        { role: "forge", text: "Try the opening." },
      ]
    );
  });

  it("freezes post-session copy and disabled/deferred input states", () => {
    assert.equal(GUEST_PREVIEW_COMPLETE_HEADLINE, "You just completed your first rep.");
    assert.equal(
      GUEST_PREVIEW_COMPLETE_BODY,
      "Save your progress and get 3 free sessions every month — no credit card required."
    );
    assert.equal(GUEST_PREVIEW_CREATE_ACCOUNT_CTA, "Create account");
    assert.equal(GUEST_PREVIEW_SIGN_IN_CTA, "Sign in");
    assert.equal(GUEST_PREVIEW_MAYBE_LATER_CTA, "Maybe later");
    assert.equal(
      GUEST_PREVIEW_DISMISSED_BODY,
      "Ready to practice again? Create an account for 3 free sessions every month."
    );
    assert.equal(GUEST_PREVIEW_GET_STARTED_CTA, "Get started");
    const arena = read("app/components/VoiceArena.tsx");
    assert.match(arena, /disabled\s*\n\s*aria-disabled="true"/);
    assert.match(arena, /setGuestAuthPrompt\("dismissed"\)/);
    assert.match(arena, /GUEST_PREVIEW_DISMISSED_BODY/);
  });

  it("keeps the Free allowance at three complete sessions per month", () => {
    assert.equal(
      entitlementFromSessionCount({
        countFailed: false,
        sessionsUsed: 2,
        limit: 3,
        status: "free",
      }).canStartPractice,
      true
    );
    assert.equal(
      entitlementFromSessionCount({
        countFailed: false,
        sessionsUsed: 3,
        limit: 3,
        status: "free",
      }).canStartPractice,
      false
    );
  });

  it("removes every retired discovery file, route, and active prompt", () => {
    const retired = [
      "app/api/assistant-coach/turn/route.ts",
      "app/api/assistant-coach/transcribe/route.ts",
      "app/api/assistant-coach/claim/route.ts",
      "app/api/assistant-coach/confirm/route.ts",
      "app/api/assistant-coach/session/route.ts",
      "app/coach/confirm/page.tsx",
      "app/coach/confirm/ConfirmClient.tsx",
      "lib/assistant-coach/reply-discipline.ts",
      "lib/assistant-coach/turn-runtime.ts",
      "lib/assistant-coach/turn-prompt.ts",
      "lib/assistant-coach/openai-model.ts",
      "lib/assistant-coach/semantic-value.ts",
      "lib/assistant-coach/observations.ts",
      "lib/assistant-coach/intervention.ts",
      "lib/assistant-coach/gate-flags.ts",
      "lib/assistant-coach/confirmation.ts",
      "lib/assistant-coach/claim.ts",
      "lib/assistant-coach/claim-merge.ts",
      "lib/ce/ac-practice-handoff.ts",
    ];
    for (const path of retired) {
      assert.equal(existsSync(join(root, path)), false, path);
    }

    const shipping = [
      ...shippingFiles("app"),
      ...shippingFiles("lib"),
      "package.json",
    ];
    const activeSource = shipping.map((path) => read(path)).join("\n");
    assert.doesNotMatch(
      activeSource,
      /\/api\/assistant-coach\/(?:turn|transcribe|claim|confirm|session)|\/coach\/confirm|hasExperiencedValue|What's on your mind\?|What’s on your mind\?|semantic gate/i
    );

    const legacyStatusFiles = new Set([
      "lib/assistant-coach/session-repository.ts",
      "lib/assistant-coach/session-service.ts",
      "lib/assistant-coach/supabase-session-repository.ts",
      "lib/forge/guest-preview.ts",
    ]);
    for (const path of shipping) {
      if (/["']gated["']/.test(read(path))) {
        assert.equal(legacyStatusFiles.has(path), true, path);
      }
    }
  });
});
