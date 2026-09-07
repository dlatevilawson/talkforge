/**
 * Product-surface regressions for public /coach.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  COACH_FORBIDDEN_UI_SUBSTRINGS,
  COACH_PRODUCT_NAME,
} from "./coach-copy.ts";
import { COACH_TOPICS, coachTopicById } from "./coach-topics.ts";
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

describe("Coach topic cards", () => {
  it("defines the exact seven-card catalog in order", () => {
    assert.deepEqual(
      COACH_TOPICS.map((topic) => topic.label),
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
    assert.equal(new Set(COACH_TOPICS.map((topic) => topic.id)).size, 7);
  });

  it("provides stable IDs and deterministic card and Forge context", () => {
    assert.deepEqual(
      COACH_TOPICS.map((topic) => topic.id),
      [
        "interview",
        "salary-negotiation",
        "difficult-feedback",
        "setting-a-boundary",
        "pitch-presentation",
        "handling-conflict",
        "something-else",
      ]
    );
    for (const topic of COACH_TOPICS) {
      assert.equal(topic.title, topic.label);
      assert.ok(topic.blurb.length > 0);
      assert.ok(topic.context.length > 0);
      assert.equal(coachTopicById(topic.id), topic);
    }
    assert.equal(coachTopicById("unknown"), null);
  });

  it("user-facing name is Coach, not Assistant Coach", () => {
    assert.equal(COACH_PRODUCT_NAME, "Coach");
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

  it("uses the shared TopicCard and routes a selection immediately", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.match(client, /import TopicCard from "@\/app\/components\/TopicCard"/);
    assert.match(client, /COACH_TOPICS\.map/);
    assert.match(client, /router\.push\(`\/forge\?topic=\$\{encodeURIComponent\(topic\.id\)\}`\)/);
    assert.match(client, /setSelectedTopicId\(topic\.id\)/);
    assert.doesNotMatch(client, /fetch\(|textarea|form|chat|thread|composer/i);
    assert.doesNotMatch(client, /signup|login|Living Profile/i);
  });

  it("keeps Coach and Training Focus catalogs independent", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    const picker = read("app/components/TrainingFocusPicker.tsx");
    const trainingCatalog = read("lib/system2/training-focus.ts");
    const sharedCard = read("app/components/TopicCard.tsx");
    assert.match(client, /COACH_TOPICS/);
    assert.doesNotMatch(client, /TRAINING_FOCUS_OPTIONS/);
    assert.match(picker, /TRAINING_FOCUS_OPTIONS\.map/);
    assert.doesNotMatch(picker, /COACH_TOPICS/);
    assert.match(picker, /<TopicCard/);
    assert.match(client, /<TopicCard/);
    assert.match(trainingCatalog, /Recover Instantly When Interrupted/);
    assert.doesNotMatch(trainingCatalog, /Pitch \/ Presentation/);
    assert.match(sharedCard, /className=\{`\$\{styles\.card\}/);
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
  it("does not embed VoiceArena, guest revival, or an auth wall in Coach", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.doesNotMatch(client, /VoiceArena|RealtimeConnection/);
    assert.doesNotMatch(client, /signup|login|mustAuthenticate/);
    const transcribe = read("lib/assistant-coach/http-transcribe.ts");
    assert.doesNotMatch(transcribe, /signInAnonymously|guest_/);
  });

  it("keeps the card page layout minimal and reuses shared card CSS", () => {
    const css = read("app/coach/coach.css");
    const sharedCss = read("app/components/TopicCard.module.css");
    assert.match(css, /\.ac-topic-grid/);
    assert.doesNotMatch(css, /ac-thread|ac-composer|ac-starter|ac-bubble/);
    assert.match(sharedCss, /\.cardSelected/);
    assert.match(sharedCss, /\.arrow svg/);
    assert.match(sharedCss, /animation:\s*card-in/);
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
