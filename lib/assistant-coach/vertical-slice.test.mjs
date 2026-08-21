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
import { AC_CONFIRM_PATH } from "./confirmation.ts";

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

  it("value gate continues to signup/login with next=/coach/confirm", () => {
    const client = read("app/coach/AssistantCoachClient.tsx");
    assert.match(client, /\/signup\?next=\/coach\/confirm/);
    assert.match(client, /\/login\?next=\/coach\/confirm/);
    assert.doesNotMatch(client, /next=\/coach"/);
  });

  it("post-signup path is confirm understanding, not resume AC or dashboard", () => {
    assert.equal(AC_CONFIRM_PATH, "/coach/confirm");
    const journey = read("atos/product/AC-JOURNEY-001-first-user-architecture.md");
    assert.match(journey, /Confirm understanding/);
    assert.match(journey, /not “resume Assistant Coach mid-thread/i);
    const confirm = read("app/coach/confirm/ConfirmClient.tsx");
    assert.match(confirm, /\/api\/assistant-coach\/claim/);
    assert.match(confirm, /\/api\/assistant-coach\/confirm/);
    assert.doesNotMatch(confirm, /VoiceArena|MissionPicker|\/app\/progress/);
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
    assert.match(realtime, /evaluatePracticeRouteAccess/);
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
