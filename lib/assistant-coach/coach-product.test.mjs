/**
 * Product-surface regressions for public /coach.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  COACH_EMPTY_HINT,
  COACH_FORBIDDEN_UI_SUBSTRINGS,
  COACH_GATE_COPY,
  COACH_GATE_TITLE,
  COACH_OPENING,
  COACH_PRODUCT_NAME,
  COACH_STATE_LISTENING,
  COACH_STATE_THINKING,
  COACH_STATE_TRANSCRIBING,
} from "./coach-copy.ts";
import { computeHasExperiencedValue } from "./semantic-value.ts";
import { generateAnonSecret } from "./anon-secret.ts";
import { ASSISTANT_COACH_ANON_COOKIE_NAME } from "./anon-cookie.ts";
import { handleAssistantCoachTranscribeRequest } from "./http-transcribe.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { classifyCoachMicError } from "./browser-mic.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Coach product copy", () => {
  it("opening is non-assumptive (no conversation/scenario force)", () => {
    assert.equal(COACH_OPENING, "What’s on your mind today?");
    assert.doesNotMatch(COACH_OPENING, /conversation that matters/i);
    assert.doesNotMatch(COACH_OPENING, /workplace|manager|meeting|scenario/i);
    assert.doesNotMatch(COACH_EMPTY_HINT, /conversation that matters/i);
  });

  it("user-facing name is Coach, not Assistant Coach", () => {
    assert.equal(COACH_PRODUCT_NAME, "Coach");
  });

  it("state labels keep listening separate from thinking", () => {
    assert.equal(COACH_STATE_LISTENING, "Listening…");
    assert.equal(COACH_STATE_TRANSCRIBING, "Transcribing…");
    assert.equal(COACH_STATE_THINKING, "Coach is thinking…");
    assert.doesNotMatch(COACH_STATE_THINKING, /listening/i);
  });

  it("gate copy has no roadmap/decision leakage", () => {
    for (const s of [COACH_GATE_TITLE, COACH_GATE_COPY]) {
      for (const forbidden of COACH_FORBIDDEN_UI_SUBSTRINGS) {
        assert.equal(
          s.includes(forbidden),
          false,
          `gate copy must not include ${forbidden}`
        );
      }
    }
  });

  it("/coach UI sources do not leak forbidden implementation language", () => {
    const stripForbiddenList = (src) =>
      src.replace(/COACH_FORBIDDEN_UI_SUBSTRINGS[\s\S]*?\] as const/, "");
    const sources = [
      stripForbiddenList(read("app/coach/AssistantCoachClient.tsx")),
      stripForbiddenList(read("app/coach/page.tsx")),
      stripForbiddenList(read("lib/assistant-coach/coach-copy.ts")),
    ].join("\n");
    for (const forbidden of COACH_FORBIDDEN_UI_SUBSTRINGS) {
      assert.equal(
        sources.includes(forbidden),
        false,
        `must not include ${forbidden}`
      );
    }
    assert.doesNotMatch(sources, /Session \$\{|· turn |Session active|Session gated/);
    assert.doesNotMatch(sources, /Coach is listening/i);
    const client = read("app/coach/AssistantCoachClient.tsx");
    // No user-visible session/turn debug chrome.
    assert.doesNotMatch(client, /ac-meta|Session \{session|turn \{/);
    assert.equal(client.includes("Claim continuity"), false);
    assert.equal(client.includes("Decision 059"), false);
  });
});

describe("Semantic value vs Living Profile completeness", () => {
  it("value flag is independent of any profile-complete concept", () => {
    const src = read("lib/assistant-coach/semantic-value.ts");
    assert.match(src, /does NOT mean Living Profile is complete/i);
    assert.doesNotMatch(src, /profileComplete|isProfileComplete|trainingPlanReady/);

    const noValue = computeHasExperiencedValue({
      messages: [{ role: "user", content: "hi" }],
      evidenceLedger: [],
      profileInsights: [],
      hasActionableIntervention: false,
    });
    assert.equal(noValue, false);

    const discoveryOnly = computeHasExperiencedValue({
      messages: [
        {
          role: "user",
          content:
            "I freeze in meetings when my manager puts me on the spot and I lose my train of thought.",
        },
        { role: "assistant", content: "What happens in your body first?" },
        {
          role: "user",
          content:
            "Especially with the CEO present — my throat tightens and I go blank.",
        },
      ],
      evidenceLedger: [
        {
          id: "e1",
          text: "Freezes when manager puts them on the spot",
          category: "communication_friction",
          confidence: "high",
          source: "coach",
          observedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          text: "Wants to speak clearly under executive pressure",
          category: "communication_goal",
          confidence: "high",
          source: "coach",
          observedAt: new Date().toISOString(),
        },
      ],
      profileInsights: [],
      hasActionableIntervention: false,
    });
    assert.equal(discoveryOnly, false);

    const valued = computeHasExperiencedValue({
      messages: [
        {
          role: "user",
          content:
            "I freeze in meetings when my manager puts me on the spot and I lose my train of thought.",
        },
        { role: "assistant", content: "What happens in your body first?" },
        {
          role: "user",
          content:
            "Especially with the CEO present — my throat tightens and I go blank.",
        },
      ],
      evidenceLedger: [
        {
          id: "e1",
          text: "Freezes when manager puts them on the spot",
          category: "communication_friction",
          confidence: "high",
          source: "coach",
          observedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          text: "Wants to speak clearly under executive pressure",
          category: "communication_goal",
          confidence: "high",
          source: "coach",
          observedAt: new Date().toISOString(),
        },
      ],
      profileInsights: [],
      hasActionableIntervention: true,
    });
    assert.equal(valued, true);
    // Value does not invent a completeness field — only boolean.
    assert.equal(typeof valued, "boolean");
  });
});

describe("Coach transcribe HTTP", () => {
  async function mint() {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    return { repo, minted };
  }

  it("transcript submission uses injectable STT and returns text", async () => {
    const { repo, minted } = await mint();
    let called = 0;
    const res = await handleAssistantCoachTranscribeRequest(
      new Request("http://localhost/api/assistant-coach/transcribe", {
        method: "POST",
        headers: {
          cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${minted.sealedCookie}`,
        },
        body: (() => {
          const fd = new FormData();
          fd.append(
            "audio",
            new File([new Uint8Array([1, 2, 3])], "coach.webm", {
              type: "audio/webm",
            })
          );
          return fd;
        })(),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        async transcribeAudio() {
          called += 1;
          return "I freeze when my manager asks me a question.";
        },
      }
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text, "I freeze when my manager asks me a question.");
    assert.equal(called, 1);
  });

  it("hard-gated session cannot transcribe (no STT spend)", async () => {
    const { repo, minted } = await mint();
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    let called = 0;
    const res = await handleAssistantCoachTranscribeRequest(
      new Request("http://localhost/api/assistant-coach/transcribe", {
        method: "POST",
        headers: {
          cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${minted.sealedCookie}`,
        },
        body: (() => {
          const fd = new FormData();
          fd.append(
            "audio",
            new File([new Uint8Array([1, 2, 3])], "coach.webm", {
              type: "audio/webm",
            })
          );
          return fd;
        })(),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        async transcribeAudio() {
          called += 1;
          return "should not run";
        },
      }
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, "must_authenticate");
    assert.equal(called, 0);
  });

  it("missing cookie returns 401", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const res = await handleAssistantCoachTranscribeRequest(
      new Request("http://localhost/api/assistant-coach/transcribe", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("audio", new File([new Uint8Array([1])], "a.webm"));
          return fd;
        })(),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        async transcribeAudio() {
          return "nope";
        },
      }
    );
    assert.equal(res.status, 401);
  });
});

describe("Coach mic helpers", () => {
  it("classifies permission errors", () => {
    assert.equal(
      classifyCoachMicError({ name: "NotAllowedError" }),
      "permission_denied"
    );
    assert.equal(
      classifyCoachMicError({ name: "NotFoundError" }),
      "not_found"
    );
  });
});

describe("Coach product scope guards", () => {
  it("does not embed VoiceArena or guest revival in the public Coach client", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.doesNotMatch(client, /VoiceArena|RealtimeConnection/);
    assert.match(client, /\/signup\?next=\/coach\/confirm/);
    const transcribe = read("lib/assistant-coach/http-transcribe.ts");
    assert.doesNotMatch(transcribe, /signInAnonymously|guest_/);
  });

  it("keeps the composer docked: only the thread scrolls", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.doesNotMatch(client, /scrollIntoView/);
    assert.match(client, /ac-shell-chat/);
    assert.match(client, /visualViewport/);
    const css = read("app/coach/coach.css");
    assert.match(css, /\.ac-shell-chat/);
    assert.match(css, /html:has\(\.ac-shell-chat\)/);
    const layout = read("app/layout.tsx");
    assert.match(layout, /interactiveWidget:\s*"resizes-content"/);
  });

  it("confirmation copy names the diagnosis, not we-placeholders", () => {
    const copy = read("lib/assistant-coach/coach-copy.ts");
    const confirm = read("app/coach/confirm/ConfirmClient.tsx");
    const confirmation = read("lib/assistant-coach/confirmation.ts");
    for (const src of [copy, confirm, confirmation]) {
      assert.doesNotMatch(src, /We’ll keep learning this with you/);
      assert.doesNotMatch(src, /We'll keep learning this with you/);
      assert.doesNotMatch(src, /A moment we’ve identified/);
      assert.doesNotMatch(src, /What we can work on first/);
    }
    assert.doesNotMatch(confirmation, /Stay clear and structured/);
    assert.match(copy, /COACH_CONFIRM_EMPTY/);
    assert.match(confirm, /COACH_CONFIRM_EMPTY/);
  });
});
