import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { logoutConfirmed } from "./logout.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const shell = readFileSync(join(root, "app/components/AppShell.tsx"), "utf8");

describe("AppShell account disclosure", () => {
  it("exposes a disclosure, not a fake menu", () => {
    assert.match(shell, /aria-expanded=\{menuOpen\}/);
    assert.match(shell, /aria-controls="app-account-menu"/);
    assert.doesNotMatch(shell, /aria-haspopup/);
  });

  it("returns focus to the account trigger on Escape", () => {
    assert.match(shell, /triggerRef/);
    assert.match(shell, /event\.key === "Escape"/);
    assert.match(shell, /triggerRef\.current\?\.focus\(\)/);
  });

  it("does not clear the session when logout fails", () => {
    assert.equal(logoutConfirmed({ ok: true }), true);
    assert.equal(logoutConfirmed({ ok: false }), false);
    assert.match(shell, /logoutConfirmed\(res\)/);
    const logoutFn = shell.slice(shell.indexOf("async function logout()"));
    const clearAt = logoutFn.indexOf("clearCurrentUserId()");
    const confirmAt = logoutFn.indexOf("logoutConfirmed(res)");
    assert.ok(confirmAt >= 0 && clearAt > confirmAt);
  });
});
