/**
 * Phase 4B.13 — proxy allowlist regression tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAssistantCoachAuthPath,
  isAssistantCoachPublicPath,
  proxyRequiresAuth,
} from "./public-routes.ts";
import { safeAuthNextPath } from "./safe-next.ts";

describe("4B.13 proxy allowlist", () => {
  it("keeps /coach and pre-auth Coach APIs public", () => {
    assert.equal(isAssistantCoachPublicPath("/coach"), true);
    assert.equal(isAssistantCoachPublicPath("/api/assistant-coach/session"), true);
    assert.equal(isAssistantCoachPublicPath("/api/assistant-coach/profile"), true);
    assert.equal(isAssistantCoachPublicPath("/api/assistant-coach/turn"), true);
    assert.equal(
      isAssistantCoachPublicPath("/api/assistant-coach/transcribe"),
      true
    );
    assert.equal(proxyRequiresAuth("/coach"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/session"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/profile"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/turn"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/transcribe"), false);
  });

  it("keeps /app /founder /onboarding /change-password protected", () => {
    assert.equal(proxyRequiresAuth("/app"), true);
    assert.equal(proxyRequiresAuth("/app/practice"), true);
    assert.equal(proxyRequiresAuth("/founder"), true);
    assert.equal(proxyRequiresAuth("/onboarding"), true);
    assert.equal(proxyRequiresAuth("/change-password"), true);
  });

  it("marks claim and confirm as auth-required at the API layer (not proxy HTML redirect)", () => {
    assert.equal(isAssistantCoachAuthPath("/api/assistant-coach/claim"), true);
    assert.equal(isAssistantCoachAuthPath("/api/assistant-coach/confirm"), true);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/claim"), false);
    assert.equal(proxyRequiresAuth("/api/assistant-coach/confirm"), false);
    assert.equal(proxyRequiresAuth("/coach/confirm"), false);
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
});
