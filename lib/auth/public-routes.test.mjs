import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FORGE_PREVIEW_CLAIM_PATH,
  isGuestForgePublicPath,
  proxyRequiresAuth,
} from "./public-routes.ts";

describe("Decision 060 proxy allowlist", () => {
  it("keeps only the card catalog and exact guest Forge surfaces public", () => {
    assert.equal(proxyRequiresAuth("/coach"), false);
    for (const path of [
      "/coach",
      "/forge",
      "/api/forge/preview",
      "/api/forge/preview/transcript",
      "/api/forge/preview/complete",
    ]) {
      assert.equal(isGuestForgePublicPath(path), true);
      assert.equal(proxyRequiresAuth(path), false);
    }
    assert.equal(isGuestForgePublicPath("/forge/extra"), false);
    assert.equal(isGuestForgePublicPath("/coach/confirm"), false);
    assert.equal(isGuestForgePublicPath("/api/forge/preview/extra"), false);
  });

  it("keeps member and staff surfaces protected", () => {
    assert.equal(isGuestForgePublicPath("/app/practice"), false);
    assert.equal(proxyRequiresAuth("/app"), true);
    assert.equal(proxyRequiresAuth("/app/practice"), true);
    assert.equal(proxyRequiresAuth("/founder"), true);
    assert.equal(proxyRequiresAuth("/onboarding"), true);
    assert.equal(proxyRequiresAuth("/change-password"), true);
  });

  it("retains only the Forge preview claim JSON exception", () => {
    assert.equal(FORGE_PREVIEW_CLAIM_PATH, "/api/forge/preview/claim");
    assert.equal(proxyRequiresAuth(FORGE_PREVIEW_CLAIM_PATH), false);
  });
});
