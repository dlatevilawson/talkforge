import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  GUEST_PREVIEW_COMPLETE_BODY,
  GUEST_PREVIEW_COMPLETE_HEADLINE,
  GUEST_PREVIEW_CREATE_ACCOUNT_CTA,
  GUEST_PREVIEW_DISMISSED_BODY,
  GUEST_PREVIEW_GET_STARTED_CTA,
  GUEST_PREVIEW_MAYBE_LATER_CTA,
  GUEST_PREVIEW_SIGN_IN_CTA,
} from "./post-session-copy.ts";

const arena = readFileSync(
  new URL("../../app/components/VoiceArena.tsx", import.meta.url),
  "utf8"
);

describe("Decision 060 post-session auth prompt", () => {
  it("freezes the Founder-approved copy exactly", () => {
    assert.equal(
      GUEST_PREVIEW_COMPLETE_HEADLINE,
      "You just completed your first rep."
    );
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
  });

  it("shows the prompt only after server completion and keeps practice closed", () => {
    assert.ok(
      arena.indexOf('setSessionPersisted(true)') <
        arena.indexOf('setGuestAuthPrompt("prompt")')
    );
    assert.match(arena, /completionResponse\.ok/);
    assert.match(arena, /role=\{guestAuthPrompt === "prompt" \? "dialog"/);
    assert.match(arena, /aria-modal=/);
    assert.match(arena, /aria-disabled="true"/);
    assert.match(arena, /Practice input is closed for this completed preview/);
    assert.match(arena, /setGuestAuthPrompt\("dismissed"\)/);
  });

  it("uses existing auth next conventions and provides a Coach return", () => {
    assert.match(arena, /\/signup\?next=\$\{encodeURIComponent/);
    assert.match(arena, /\/login\?next=\$\{encodeURIComponent/);
    assert.match(arena, /previewClaimReturnPath\(guestPreview\.topicId\)/);
    assert.match(arena, /href="\/coach"/);
  });
});
