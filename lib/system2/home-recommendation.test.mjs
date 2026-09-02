import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyLivingProfile } from "../system1/profile.ts";
import {
  buildHomeAlternatives,
  canStartTraining,
  isExplorerFromSessionHistory,
  practiceEntryHref,
} from "./home-recommendation.ts";
import { APP_HOME_SCREEN_COPY, HOME_ALTERNATIVE_CATALOG } from "./home-copy.ts";
import { buildAdaptiveHome, recommendNextStep } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function profileWithPurpose(purpose) {
  const profile = emptyLivingProfile("user-1", "Inspection");
  profile.version = 1;
  profile.purposeStatement = purpose;
  return profile;
}

describe("Adaptive home recommendation contract", () => {
  it("still recommends when principles are stored as plain strings", () => {
    const profile = profileWithPurpose("Lead without rushing");
    profile.personalPrinciples = ["Speak plainly"];
    const home = buildAdaptiveHome(profile);
    assert.equal(home.readiness.profileGatePassed, true);
    assert.equal(home.recommendation?.href, "/app/practice");
  });

  it("returns exactly one next step, never a menu", () => {
    const home = buildAdaptiveHome(profileWithPurpose("Lead without rushing"));
    assert.equal(home.isPrimaryHome, true);
    assert.ok(home.recommendation);
    assert.equal(home.recommendation.href, "/app/practice");
    assert.equal(home.recommendation.title, "Continue toward your goal");
    assert.match(home.recommendation.continuityLine, /Lead without rushing/);
    assert.doesNotMatch(home.recommendation.continuityLine, /pick a starting/i);
    assert.equal(recommendNextStep(profileWithPurpose("Lead without rushing"))?.href, "/app/practice");
  });

  it("does not treat a failed session count as Explorer", () => {
    assert.equal(isExplorerFromSessionHistory({ status: "unknown" }), false);
    assert.equal(isExplorerFromSessionHistory({ status: "known", completed: 2 }), false);
    assert.equal(isExplorerFromSessionHistory({ status: "known", completed: 0 }), true);
  });

  it("does not invent alternatives when session history failed", () => {
    assert.deepEqual(
      buildHomeAlternatives({ status: "unknown" }, HOME_ALTERNATIVE_CATALOG),
      []
    );
  });

  it("keeps Explorer Assessment demoted and returning alternatives at most two", () => {
    const explorer = buildHomeAlternatives(
      { status: "known", completed: 0 },
      HOME_ALTERNATIVE_CATALOG
    );
    assert.equal(explorer.length, 1);
    assert.equal(explorer[0].mode, "assessment");
    const returning = buildHomeAlternatives(
      { status: "known", completed: 3 },
      HOME_ALTERNATIVE_CATALOG
    );
    assert.ok(returning.length > 0);
    assert.ok(returning.length <= 2);
    assert.ok(returning.every((item) => item.mode !== "assessment"));
  });

  it("locks training until entitlement is open", () => {
    assert.equal(canStartTraining({ status: "open" }), true);
    assert.equal(canStartTraining({ status: "limited" }), false);
    assert.equal(canStartTraining({ status: "unknown" }), false);
  });

  it("builds a native practice entry href", () => {
    assert.equal(practiceEntryHref({}), "/app/practice?start=1");
    assert.match(
      practiceEntryHref({ title: "Lead without rushing" }),
      /\/app\/practice\?start=1&title=/
    );
    assert.match(
      practiceEntryHref({ mode: "assessment" }),
      /mode=assessment/
    );
  });
});

describe("Continuity Home implements the Coach contract", () => {
  const home = readFileSync(join(root, "app/components/ContinuityHome.tsx"), "utf8");
  const copy = readFileSync(join(root, "lib/system2/home-copy.ts"), "utf8");

  it("renders the readiness recommendation as the primary action", () => {
    assert.match(home, /buildAdaptiveHome/);
    assert.match(home, /recommendation\?\.title/);
    assert.match(home, /recommendation\?\.continuityLine/);
    assert.match(home, /Today’s recommendation/);
    assert.match(home, /className=\{styles\.primaryAction\}/);
    assert.doesNotMatch(home, /buildWorkOptions|buildExplorerOptions/);
    assert.doesNotMatch(home, /role=["']listitem["']/);
    assert.doesNotMatch(home, /Pick a starting place/);
  });

  it("does not convert a session-count failure into Explorer", () => {
    assert.match(home, /status: "unknown"/);
    assert.match(home, /isExplorerFromSessionHistory/);
    assert.doesNotMatch(home, /setIsExplorer\(true\)/);
    assert.doesNotMatch(home, /setIsExplorer\(completed === 0\)/);
  });

  it("does not render active training controls when practice is limited", () => {
    assert.match(home, /practiceLimited/);
    assert.match(home, /canStartTraining/);
    assert.match(home, /Claim Your Founding Pass|CLAIM_FOUNDING_PASS_CTA/);
    assert.match(home, /if \(!trainingOpen\) return/);
  });

  it("uses Coach copy instead of a training menu", () => {
    assert.match(copy, /Today, we’re training this/);
    assert.doesNotMatch(copy, /Where do you need to be heard today/);
    assert.doesNotMatch(copy, /Pick a starting place/);
    assert.equal(APP_HOME_SCREEN_COPY.alternatives.length, 2);
  });

  it("keeps native Begin navigation into practice", () => {
    assert.match(home, /location\.assign\s*\(\s*`\/app\/practice/);
  });
});
