import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  PRACTICE_AUDIENCE_CATALOG,
  PRACTICE_PATTERN_CATALOG,
  PRACTICE_TOPIC_CATALOG,
  PRACTICE_URGENCY_CATALOG,
} from "./practice-profile.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(join(root, path), "utf8");
const client = read("app/coach/AssistantCoachClient.tsx");
const css = read("app/coach/coach.css");
const profileHandler = read("lib/assistant-coach/http-profile.ts");

describe("Decision 060 Coach wizard UI", () => {
  it("renders the exact three phases and governed catalogs", () => {
    for (const copy of [
      "Pick your moments",
      "Narrow the context",
      "Your Coach profile",
      "Looks right",
      "Adjust",
      "Diagnose",
    ]) {
      assert.match(client, new RegExp(copy));
    }
    for (const item of [
      ...PRACTICE_TOPIC_CATALOG,
      ...PRACTICE_AUDIENCE_CATALOG,
      ...PRACTICE_PATTERN_CATALOG,
      ...PRACTICE_URGENCY_CATALOG,
    ]) {
      assert.ok(item.label.length > 0);
    }
    assert.match(client, /PRACTICE_TOPIC_CATALOG\.map/);
    assert.match(client, /PRACTICE_AUDIENCE_CATALOG\.map/);
    assert.match(client, /PRACTICE_PATTERN_CATALOG\.map/);
    assert.match(client, /PRACTICE_URGENCY_CATALOG\.map/);
    for (const question of [
      "Who are these conversations with?",
      "What trips you up most?",
      "When is this happening?",
    ]) {
      assert.match(client, new RegExp(question.replace("?", "\\?")));
    }
    assert.deepEqual(PRACTICE_PATTERN_CATALOG.map((item) => item.label), [
      "I freeze and don't know what to say",
      "I ramble and lose the thread",
      "I get emotional or defensive",
      "I sound too harsh or aggressive",
      "I cave as soon as they push back",
      "I avoid the conversation entirely",
    ]);
    assert.equal(
      PRACTICE_URGENCY_CATALOG.find((item) => item.id === "next_2_weeks")
        ?.label,
      "In the next 2 weeks"
    );
  });

  it("keeps selection constraints and restore behavior in the client", () => {
    assert.match(client, /topics\.length < 1 \|\| topics\.length > 3/);
    assert.match(client, /current\.topics\.length < 3/);
    assert.match(client, /disabled=\{!isValidTopicSelection\(wizard\.topics\)\}/);
    assert.match(client, /disabled=\{!complete\}/);
    assert.match(client, /PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH/);
    assert.match(client, /sessionStorage\.getItem\(WIZARD_STORAGE_KEY\)/);
    assert.match(client, /sessionStorage\.setItem\(WIZARD_STORAGE_KEY/);
    assert.match(client, /phase:\s*2,\s*verified:\s*false/);
    assert.match(
      client,
      /current\.sessionId && current\.sessionId !== sessionId[\s\S]*EMPTY_WIZARD/
    );
  });

  it("projects and submits only the explicit selection boundary", () => {
    assert.match(
      client,
      /const selection = selectMemberPracticeProfileSelection\(wizard\);/
    );
    assert.match(client, /projectMemberPracticeProfile\(selection\)/);
    assert.doesNotMatch(client, /projectMemberPracticeProfile\(wizard\)/);
    assert.doesNotMatch(
      client,
      /validateMemberPracticeProfileSelection\(wizard\)/
    );
    assert.match(client, /body: JSON\.stringify\(\{\s*selection,\s*\}\)/);
  });

  it("uses native accessible controls and responsive safe-area styling", () => {
    assert.match(client, /aria-pressed=\{selected\}/);
    assert.match(client, /role="radiogroup"/);
    assert.match(client, /role="radio"/);
    assert.match(client, /aria-checked=/);
    for (const icon of [
      "BriefcaseIcon",
      "TrendingUpIcon",
      "MessageSquareWarningIcon",
      "ShieldIcon",
      "MicIcon",
      "ZapIcon",
      "HandIcon",
      "EarIcon",
      "ScissorsIcon",
      "PlusIcon",
    ]) {
      assert.match(client, new RegExp(`function ${icon}`));
    }
    assert.match(client, /aria-hidden="true"/);
    assert.match(client, /focusable="false"/);
    assert.match(client, /TOPIC_ICON_BY_ID\[topic\.id\]/);
    assert.match(css, /\.ac-card-grid/);
    assert.match(css, /\.ac-topic-icon/);
    assert.match(css, /\.ac-choice-card\[aria-pressed="true"\]/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
    assert.match(css, /@media \(max-width: 540px\)/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /prefers-reduced-motion/);
  });

  it("calls only session and deterministic profile APIs", () => {
    assert.match(client, /\/api\/assistant-coach\/session/);
    assert.match(client, /\/api\/assistant-coach\/profile/);
    for (const forbidden of [
      "/api/assistant-coach/turn",
      "/api/assistant-coach/transcribe",
      "OpenAI",
      "messages",
      "hasExperiencedValue",
      "semantic",
    ]) {
      assert.doesNotMatch(client, new RegExp(forbidden));
      assert.doesNotMatch(profileHandler, new RegExp(forbidden, "i"));
    }
  });

  it("gates guests through activation and sends authenticated members to Forge", () => {
    assert.match(client, /\/signup\?next=\/coach\/activate/);
    assert.match(client, /\/login\?next=\/coach\/activate/);
    assert.match(client, /start coaching in Forge/);
    assert.doesNotMatch(client, /continue with Coach/);
    assert.match(client, /body\.destination === COACH_WIZARD_PRACTICE_DESTINATION/);
    assert.doesNotMatch(client, /\/coach\/confirm/);
  });
});
