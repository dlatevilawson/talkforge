import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  COACH_WIZARD_HANDOFF_SOURCE,
  COACH_WIZARD_PRACTICE_DESTINATION,
  resolveCoachWizardPracticeContext,
} from "../assistant-coach/forge-handoff.ts";
import { createVerifiedMemberPracticeProfile } from "../assistant-coach/practice-profile.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Decision 060 Realtime boundary", () => {
  it("loads structured context server-side and never accepts a readiness bypass", () => {
    const route = readFileSync(
      join(root, "app/api/realtime/session/route.ts"),
      "utf8"
    );
    const config = readFileSync(
      join(root, "lib/ce/session-config.ts"),
      "utf8"
    );
    assert.match(route, /requireApiUser\(\)/);
    assert.match(route, /ensurePersistedLivingProfile\(supabase, user\)/);
    assert.match(route, /resolveCoachWizardPracticeContext/);
    assert.match(route, /practiceContext/);
    assert.match(config, /buildStructuredPracticeObjectiveLines/);
    assert.match(config, /practiceContext\?: ForgePracticeContext/);
    assert.doesNotMatch(route, /if \(!readiness\.allowed && !acHandoff\)/);
    assert.match(route, /if \(!readiness\.allowed\)/);
    assert.ok(
      route.indexOf("requireApiUser()") < route.indexOf("await req.json()"),
      "authentication must happen before client body parsing"
    );
  });

  it("uses verified LP context only for marked wizard practice", () => {
    const profile = createVerifiedMemberPracticeProfile({
      selection: {
        topics: [{ id: "job_interview", customText: null }],
        audiences: ["recruiter_hr"],
        pattern: "freeze",
        urgency: "today",
      },
      sourceSessionId: "session_1",
      now: new Date("2026-09-07T07:00:00.000Z"),
    });
    assert.equal(
      resolveCoachWizardPracticeContext({
        source: undefined,
        mode: "practice",
        memberPracticeProfile: profile,
      }),
      null
    );
    assert.equal(
      resolveCoachWizardPracticeContext({
        source: COACH_WIZARD_HANDOFF_SOURCE,
        mode: "assessment",
        memberPracticeProfile: profile,
      }),
      null
    );
    const marked = resolveCoachWizardPracticeContext({
      source: COACH_WIZARD_HANDOFF_SOURCE,
      mode: "practice",
      memberPracticeProfile: profile,
    });
    assert.equal(marked.primaryTopic.id, "job_interview");
    assert.equal(marked.primaryAudience.id, "recruiter_hr");
  });

  it("uses a marker-only auto-start destination without profile values", () => {
    const activation = readFileSync(
      join(root, "lib/assistant-coach/activation.ts"),
      "utf8"
    );
    const practice = readFileSync(
      join(root, "app/app/practice/page.tsx"),
      "utf8"
    );
    assert.equal(
      COACH_WIZARD_PRACTICE_DESTINATION,
      "/app/practice?source=coach_wizard&start=1"
    );
    assert.match(activation, /COACH_WIZARD_PRACTICE_DESTINATION/);
    assert.doesNotMatch(
      activation,
      /[?&](?:title|success|topic|audience|pattern|urgency)=/
    );
    assert.match(practice, /wizardHandoff \|\| first\(params\.start\) === "1"/);
    assert.match(practice, /resolveCoachWizardPracticeContext/);
    assert.match(practice, /practiceContext=\{practiceContext\}/);
  });

  it("never changes account status during activation", () => {
    const store = readFileSync(
      join(root, "lib/assistant-coach/activation-server.ts"),
      "utf8"
    );
    assert.match(store, /\.update\(\{ onboarding_complete: true \}\)/);
    assert.doesNotMatch(store, /account_status/);
  });
});
