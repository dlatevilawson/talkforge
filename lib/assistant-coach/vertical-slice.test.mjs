/**
 * First-user vertical slice wiring: landing → /coach → confirm → Forge href.
 * Does not expand Forge, Progress, or AC prompts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { proxyRequiresAuth } from "../auth/public-routes.ts";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Vertical slice contract", () => {
  it("landing primary CTA goes to /coach, not /signup", () => {
    const landing = read("app/components/landing/LandingPage.tsx");
    assert.match(landing, /href="\/coach"/);
    assert.doesNotMatch(
      landing,
      /href="\/signup"[\s\S]{0,80}Prepare for today/
    );
    const nav = read("app/components/landing/LandingNav.tsx");
    assert.match(nav, /authed \? "\/app" : "\/coach"/);
  });

  it("verified wizard continues to auth with next=/coach/activate", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.match(client, /\/signup\?next=\/coach\/activate/);
    assert.match(client, /\/login\?next=\/coach\/activate/);
    assert.doesNotMatch(client, /next=\/coach\/confirm/);
  });

  it("defers activation and Forge handoff to the next slice", () => {
    const journey = read("atos/product/AC-JOURNEY-001-first-user-architecture.md");
    assert.match(journey, /AUTH_REQUIRED/);
    assert.match(journey, /activation succeeds/);
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.doesNotMatch(client, /\/api\/assistant-coach\/claim/);
    assert.doesNotMatch(client, /\/app\/practice/);
  });

  it("proxy keeps /coach/confirm public and /app/practice auth-gated", () => {
    assert.equal(proxyRequiresAuth("/coach/confirm"), false);
    assert.equal(proxyRequiresAuth("/app/practice"), true);
    const proxy = read("lib/supabase/proxy.ts");
    assert.match(proxy, /startsWith\("\/app\/practice"\)/);
  });

  it("Looks right carries identifiedMoment into Forge and never falls back to bare practice", () => {
    const confirm = read("app/coach/confirm/ConfirmClient.tsx");
    assert.match(confirm, /isConfirmedForgeHandoffHref/);
    assert.match(confirm, /isPracticableMoment/);
    assert.doesNotMatch(confirm, /practiceHref \|\| "\/app\/practice"/);
    assert.match(confirm, /disabled=\{!ready \|\| pending\}/);
    const practice = read("app/app/practice/page.tsx");
    assert.match(practice, /isAssistantCoachPracticeHandoff/);
    assert.match(practice, /handoffSource/);
    const realtime = read("app/api/realtime/session/route.ts");
    assert.match(realtime, /AC_HANDOFF_SOURCE/);
    assert.match(realtime, /applyConfirmedPracticeHandoff/);
    assert.match(realtime, /handoffSource: acHandoff \? AC_HANDOFF_SOURCE/);
    const sessionConfig = read("lib/ce/session-config.ts");
    assert.match(sessionConfig, /handoffSource/);
    assert.match(sessionConfig, /buildAcPracticeObjectiveLines/);
    const handoff = read("lib/ce/ac-practice-handoff.ts");
    assert.match(handoff, /CONFIRMED CONVERSATION/);
    assert.match(handoff, /Do not ask what brought them in/);
    const arena = read("app/components/VoiceArena.tsx");
    assert.match(arena, /handoffSource: isAssessment \? undefined : handoffSource/);
    const opening = read("lib/coach/philosophy.ts");
    assert.match(opening, /confirmed first practice, not discovery/);
    assert.match(opening, /Do NOT ask what brought them in/);
  });

  it("signup/login with next=/coach/confirm skips the focus picker", () => {
    const auth = read("app/actions/auth.ts");
    assert.match(auth, /next\.startsWith\("\/coach\/confirm"\)/);
    const confirm = read("app/coach/confirm/ConfirmClient.tsx");
    assert.doesNotMatch(confirm, /TrainingFocusPicker|What conversation are you preparing for/);
    const practice = read("app/app/practice/page.tsx");
    assert.doesNotMatch(practice, /import ContinuityHome|TrainingFocusPicker/);
  });

  it("does not revive guest identity or write purpose from AC claim route", () => {
    const claim = read("lib/assistant-coach/claim.ts");
    const merge = read("lib/assistant-coach/claim-merge.ts");
    assert.doesNotMatch(claim, /signInAnonymously|guest_/);
    assert.match(merge, /Draft purpose is always ignored|draft purpose/);
  });
});
