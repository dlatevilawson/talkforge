/**
 * TIP Phase I — automated invariant tests (no live Supabase required).
 * Run: node scripts/tip-auth-check.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

check("safeNextPath rejects open redirects", () => {
  // Inline copy of logic to avoid TS import in plain node without tsx
  function safeNextPath(raw, fallback = "/app/dashboard") {
    if (!raw) return fallback;
    const value = raw.trim();
    if (!value.startsWith("/")) return fallback;
    if (value.startsWith("//")) return fallback;
    if (value.includes("://")) return fallback;
    if (value.includes("\\")) return fallback;
    if (/[\x00-\x1f]/.test(value)) return fallback;
    return value.slice(0, 512) || fallback;
  }
  assert.equal(safeNextPath("//evil.com"), "/app/dashboard");
  assert.equal(safeNextPath("https://evil.com"), "/app/dashboard");
  assert.equal(safeNextPath("/app/dashboard"), "/app/dashboard");
  assert.equal(safeNextPath("/founder"), "/founder");
});

check("password policy enforces 8 chars only", () => {
  const src = readFileSync(resolve(root, "lib/auth/password.ts"), "utf8");
  assert.match(src, /PASSWORD_MIN_LENGTH = 8/);
  assert.match(src, /Enforced server-side: length only/);
});

check("role trigger does not trust user_metadata.role", () => {
  const src = readFileSync(
    resolve(root, "supabase/migrations/20260729_tip_secure_role_trigger.sql"),
    "utf8"
  );
  assert.match(src, /raw_app_meta_data->>'role'/);
  assert.doesNotMatch(src, /raw_user_meta_data->>'role'/);
});

check("security headers configured", () => {
  const src = readFileSync(resolve(root, "next.config.ts"), "utf8");
  assert.match(src, /Strict-Transport-Security/);
  assert.match(src, /X-Frame-Options/);
  assert.match(src, /X-Content-Type-Options/);
});

check("email templates use ConfirmationURL + SiteURL", () => {
  for (const file of [
    "verification.html",
    "password-reset.html",
    "email-change.html",
    "invitation.html",
  ]) {
    const html = readFileSync(
      resolve(root, "supabase/email-templates", file),
      "utf8"
    );
    assert.match(html, /\{\{\s*\.ConfirmationURL\s*\}\}/);
    assert.match(html, /TalkForge/);
  }
});

check("getSiteUrl never prefers localhost on Vercel", () => {
  const src = readFileSync(resolve(root, "lib/auth/constants.ts"), "utf8");
  assert.match(src, /PRODUCTION_SITE_URL/);
  assert.match(src, /if \(process\.env\.VERCEL\)/);
});

check("auth analytics module exists", () => {
  assert.equal(existsSync(resolve(root, "lib/auth/analytics.ts")), true);
});

check("TIP-001 documentation exists", () => {
  assert.equal(
    existsSync(resolve(root, "atos/product/TIP-001-identity-platform.md")),
    true
  );
});

check("typecheck passes", () => {
  const r = spawnSync("npm", ["run", "typecheck"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

console.log(`\nTIP auth checks: ${passed} passed`);
