/**
 * Phase 4B.13 — proxy allowlist regression tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  allowsUnverifiedCoachContinuity,
  allowsUnverifiedCoachContinuityUrl,
  isAssistantCoachPublicPath,
  proxyRequiresAuth,
  unauthenticatedAuthDestination,
} from "./public-routes.ts";
import { safeAuthNextPath } from "./safe-next.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("4B.13 proxy allowlist", () => {
  it("keeps /coach and pre-auth Coach APIs public", () => {
    assert.equal(isAssistantCoachPublicPath("/coach"), true);
    assert.equal(isAssistantCoachPublicPath("/api/assistant-coach/session"), true);
    assert.equal(isAssistantCoachPublicPath("/api/assistant-coach/profile"), true);
    assert.equal(proxyRequiresAuth("/coach"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/session"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/profile"), false);
  });

  it("exposes no superseded Coach endpoint or review page", () => {
    for (const path of [
      "/api/assistant-coach/turn",
      "/api/assistant-coach/transcribe",
      "/api/assistant-coach/claim",
      "/api/assistant-coach/confirm",
      "/coach/confirm",
    ]) {
      assert.equal(isAssistantCoachPublicPath(path), false);
    }
    assert.equal(safeAuthNextPath("/coach/confirm", "/app"), "/app");
  });

  it("keeps /app /founder /onboarding /change-password protected", () => {
    assert.equal(proxyRequiresAuth("/app"), true);
    assert.equal(proxyRequiresAuth("/app/practice"), true);
    assert.equal(proxyRequiresAuth("/founder"), true);
    assert.equal(proxyRequiresAuth("/onboarding"), true);
    assert.equal(proxyRequiresAuth("/change-password"), true);
  });

  it("protects activation while allowing auth to preserve only its exact return", () => {
    assert.equal(isAssistantCoachPublicPath("/coach/activate"), false);
    assert.equal(proxyRequiresAuth("/coach/activate"), true);
    assert.equal(safeAuthNextPath("/coach/activate", "/app"), "/coach/activate");
    for (const unsafe of [
      "//evil.example/coach/activate",
      "https://evil.example/coach/activate",
      "/coach/activate/extra",
      "/coach/activate?next=https://evil.example",
      "/coach/activate#//evil.example",
    ]) {
      assert.equal(safeAuthNextPath(unsafe, "/app"), "/app");
    }
  });

  it("soft-verifies only activation and the exactly marked first practice", () => {
    assert.equal(
      allowsUnverifiedCoachContinuity(
        "/coach/activate",
        new URLSearchParams()
      ),
      true
    );
    assert.equal(
      allowsUnverifiedCoachContinuity(
        "/app/practice",
        new URLSearchParams("source=coach_wizard&start=1")
      ),
      true
    );
    assert.equal(
      allowsUnverifiedCoachContinuityUrl(
        "/app/practice?source=coach_wizard&start=1"
      ),
      true
    );

    for (const value of [
      "/app",
      "/app/practice",
      "/app/practice?start=1",
      "/app/practice?source=coach",
      "/app/practice?source=coach_wizard_extra",
      "/app/practice?source=coach_wizard&source=coach_wizard",
      "/app/training?source=coach_wizard",
      "/coach",
      "/coach/anything",
    ]) {
      assert.equal(
        allowsUnverifiedCoachContinuityUrl(value),
        false,
        value
      );
    }
  });

  it("keeps activation and marked or unmarked practice authenticated", () => {
    for (const pathname of ["/coach/activate", "/app/practice"]) {
      assert.equal(proxyRequiresAuth(pathname), true);
      assert.equal(unauthenticatedAuthDestination(pathname), "/signup");
    }
  });

  it("applies soft verification after auth and before unchanged app gates", () => {
    const proxy = readFileSync(
      join(root, "lib/supabase/proxy.ts"),
      "utf8"
    );
    const authGate = proxy.indexOf("if (!userId)");
    const continuity = proxy.indexOf("allowsUnverifiedCoachContinuity(");
    const appGate = proxy.indexOf("if (pathname.startsWith(\"/app\"))");
    assert.ok(authGate >= 0 && continuity > authGate);
    assert.ok(appGate > continuity);
    assert.match(proxy, /account_status === "suspended"/);
    assert.match(proxy, /!profile\.onboarding_complete/);

    const action = readFileSync(join(root, "app/actions/auth.ts"), "utf8");
    assert.match(
      action,
      /!profile\.email_verified[\s\S]*!allowsUnverifiedCoachContinuityUrl\(next\)/
    );

    const practice = readFileSync(
      join(root, "app/app/practice/page.tsx"),
      "utf8"
    );
    assert.match(practice, /ensurePersistedLivingProfile/);
    assert.match(practice, /evaluatePracticeRouteAccess/);
    assert.match(practice, /evaluatePracticeEntitlement/);
  });
});
