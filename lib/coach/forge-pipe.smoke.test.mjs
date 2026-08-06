/**
 * Smoke test: Coach Forge pipe + first-session check-in stay connected.
 * Run: node --experimental-strip-types --test lib/coach/forge-pipe.smoke.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import {
  FORGE_FIRST_PRINCIPLE,
  FORGE_MENTOR_PHILOSOPHY,
  buildOpeningSpeechInstructions,
} from "./philosophy.ts";
import {
  FIRST_SESSION_OPTIONAL_PROMPT,
  FIRST_SESSION_RATING_TITLE,
  FIRST_SESSION_THANKS_TITLE,
  followUpBandForStars,
  followUpOptionsForBand,
  isFirstSessionExplorePath,
  isValidFollowUpForStars,
} from "../first-session-feedback.ts";

const root = resolve(import.meta.dirname, "../..");

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Coach Forge pipe smoke (CFP + IV-UX-010)", () => {
  it("encodes first principle into mentor SSOT and openings", () => {
    assert.equal(FORGE_FIRST_PRINCIPLE, "Understand before you coach.");
    assert.match(FORGE_MENTOR_PHILOSOPHY, /THE FIRST PRINCIPLE/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /70–80%/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Do not coach when they need to vent/);
    assert.match(
      FORGE_MENTOR_PHILOSOPHY,
      /world's-greatest communication coach|world’s-greatest communication coach/i
    );

    const opening = buildOpeningSpeechInstructions({
      welcomeHint: "First-time welcome.",
      isReturning: false,
      eventTitle: "The conversation I’ve been avoiding",
    });
    assert.match(opening, /Understand before you coach/i);
    assert.match(opening, /The conversation I’ve been avoiding/);
    assert.match(opening, /questionnaire/i);
    assert.doesNotMatch(opening, /What would you like to practice today\?/i);

    const returning = buildOpeningSpeechInstructions({
      welcomeHint: "Forge Law #012 continuity. Welcome back.",
      isReturning: true,
    });
    assert.match(returning, /continuity/i);
  });

  it("keeps session-config and memory SSOT wired to CFP/CFX", () => {
    const sessionConfig = read("lib/ce/session-config.ts");
    assert.match(sessionConfig, /FORGE_MENTOR_PHILOSOPHY/);
    assert.match(sessionConfig, /Understand before you coach/);
    assert.match(sessionConfig, /70–80%/);
    assert.match(sessionConfig, /need most right now/i);
    assert.match(sessionConfig, /CFP-001/);

    const memory = read("lib/coach/memory.ts");
    assert.match(memory, /First-time welcome \(CFX §5\)/);
    assert.match(memory, /Forge Law #012/);
    assert.match(memory, /buildWelcomeHint/);
  });

  it("keeps first-session check-in mission-aligned and once-gated in UI wiring", () => {
    assert.equal(
      FIRST_SESSION_RATING_TITLE,
      "Did Forge feel like a world-class communication coach?"
    );
    assert.match(
      FIRST_SESSION_OPTIONAL_PROMPT,
      /made this session even better/i
    );
    assert.match(
      FIRST_SESSION_THANKS_TITLE,
      /world’s best communication coach/i
    );

    assert.equal(followUpBandForStars(5), "high");
    assert.equal(followUpBandForStars(3), "mid");
    assert.equal(followUpBandForStars(1), "low");
    assert.ok(isValidFollowUpForStars(5, followUpOptionsForBand("high")[0].id));
    assert.equal(isValidFollowUpForStars(5, "technical"), false);

    assert.equal(isFirstSessionExplorePath("/app/profile"), true);
    assert.equal(isFirstSessionExplorePath("/app/progress"), true);
    assert.equal(isFirstSessionExplorePath("/app/dashboard"), true);
    assert.equal(isFirstSessionExplorePath("/app"), false);
    assert.equal(isFirstSessionExplorePath("/app/practice"), false);

    const arena = read("app/components/VoiceArena.tsx");
    assert.match(arena, /FirstSessionExperienceRating/);
    assert.match(arena, /isFirstSession/);
    assert.match(arena, /sessionPersisted/);
    assert.match(arena, /canEndSession/);
    assert.match(arena, /reportFirstSessionReturnSignal\("session_started"\)/);

    const home = read("app/components/ContinuityHome.tsx");
    assert.match(home, /enterPractice/);
    assert.match(home, /start:\s*"1"/);
    assert.match(home, /\/app\/practice\?/);
    assert.match(home, /reportFirstSessionReturnSignal\("home_visit"\)/);

    const shell = read("app/components/AppShell.tsx");
    assert.match(shell, /explored_feature/);
    assert.match(shell, /isFirstSessionExplorePath/);

    const api = read("app/api/first-session-feedback/route.ts");
    assert.match(api, /explored_another_feature/);
    assert.match(api, /duration_seconds/);
    assert.match(api, /returned_within_24h/);
    assert.match(api, /returned_within_7d/);

    const migration = read(
      "supabase/migrations/20260806_first_session_experience_ratings.sql"
    );
    assert.match(migration, /explored_another_feature/);
    assert.match(migration, /optional_comment/);
    assert.match(migration, /user_id uuid not null unique/);

    const practicePage = read("app/app/practice/page.tsx");
    assert.match(practicePage, /VoiceArena/);
    assert.match(practicePage, /autoStart/);
    assert.match(practicePage, /eventTitle/);
  });
});
