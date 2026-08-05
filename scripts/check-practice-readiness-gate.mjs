/**
 * Practice readiness gate.
 *
 * Prevents the Begin → /app/practice redirect trap:
 * homepage looking "ready" while the practice route denies entry because no
 * persisted living_profiles row exists.
 *
 * Code contracts always run.
 * Pass --live (or PRACTICE_READINESS_LIVE=1) to also fail when production
 * profiles exist without a living_profiles row.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const homePath = resolve(root, "app/components/ContinuityHome.tsx");
const practicePath = resolve(root, "app/app/practice/page.tsx");
const readinessPath = resolve(root, "lib/system2/server-readiness.ts");
const readinessModelPath = resolve(root, "lib/system2/types.ts");
const livingApiPath = resolve(root, "app/api/living-profile/route.ts");
const ensurePath = resolve(root, "lib/system1/ensure-living-profile.ts");
const realtimePath = resolve(root, "app/api/realtime/session/route.ts");
const signupLpMigrationPath = resolve(
  root,
  "supabase/migrations/20260805_living_profile_on_signup.sql"
);

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF?.trim() || "wudjmxqbsozreepgjvef";

function assertHomeGate(source) {
  assert.doesNotMatch(
    source,
    /emptyLivingProfile\s*\(/,
    "ContinuityHome must not synthesize emptyLivingProfile for readiness"
  );
  assert.match(
    source,
    /version\s*>=\s*1/,
    "ContinuityHome must require persisted Living Profile version >= 1"
  );
  assert.match(
    source,
    /\/api\/living-profile/,
    "ContinuityHome must load Living Profile from the API"
  );
  assert.match(
    source,
    /location\.assign\s*\(\s*`\/app\/practice/,
    "Begin must use native navigation into /app/practice"
  );
}

function assertPracticePage(source) {
  assert.match(
    source,
    /evaluatePracticeRouteAccess/,
    "practice page must enforce server readiness"
  );
  assert.match(
    source,
    /redirect\(`\/app\?gate=\$\{access\.reason\}`\)|redirect\s*\(\s*["']\/app/,
    "practice page must redirect incomplete members to /app with gate reason"
  );
}

function assertServerReadiness(source) {
  assert.match(
    source,
    /ensurePersistedLivingProfile/,
    "practice readiness must ensure a persisted Living Profile"
  );
  assert.doesNotMatch(
    source,
    /emptyLivingProfile\s*\(/,
    "practice readiness must not invent an in-memory Living Profile"
  );
}

function assertLivingProfileApi(source) {
  assert.match(
    source,
    /ensurePersistedLivingProfile/,
    "GET /api/living-profile must ensure a persisted Living Profile"
  );
}

function assertEnsureHelper(source) {
  assert.match(source, /export async function ensurePersistedLivingProfile/);
  assert.match(source, /version:\s*1/);
  assert.match(source, /coaching_intensity:\s*["']steady["']/);
  assert.match(source, /\.from\(\s*["']living_profiles["']\s*\)/);
  assert.match(source, /\.insert\(/);
  assert.match(
    source,
    /account_profile|member_declared/,
    "bootstrap provenance must remain account/member declared"
  );
}

function assertReadinessRequiresContext(source) {
  assert.match(
    source,
    /!hasPurpose\s*&&\s*!hasPrinciple\s*&&\s*!hasSeason/,
    "readiness must not pass on account displayName alone"
  );
  assert.doesNotMatch(
    source,
    /!hasName\s*&&\s*!hasPurpose\s*&&\s*!hasPrinciple\s*&&\s*!hasSeason/,
    "name-only readiness unlock must stay retired"
  );
  assert.match(
    source,
    /href:\s*["']\/app\/profile["']/,
    "incomplete readiness must recommend Living Profile, not practice"
  );
}

function assertRealtimeReadiness(source) {
  assert.match(
    source,
    /evaluatePracticeRouteAccess/,
    "realtime mint must share the practice readiness boundary"
  );
}

function assertSignupCreatesLivingProfile(source) {
  assert.match(source, /create or replace function public\.handle_new_user/);
  assert.match(
    source,
    /insert into public\.living_profiles/,
    "signup trigger must create living_profiles"
  );
  assert.match(source, /raw_app_meta_data->>'role'/);
  assert.doesNotMatch(source, /raw_user_meta_data->>'role'/);
}

async function runCodeContracts() {
  const [home, practice, readiness, model, livingApi, ensure, realtime, signupLp] =
    await Promise.all([
      readFile(homePath, "utf8"),
      readFile(practicePath, "utf8"),
      readFile(readinessPath, "utf8"),
      readFile(readinessModelPath, "utf8"),
      readFile(livingApiPath, "utf8"),
      readFile(ensurePath, "utf8"),
      readFile(realtimePath, "utf8"),
      readFile(signupLpMigrationPath, "utf8"),
    ]);

  assertHomeGate(home);
  assertPracticePage(practice);
  assertServerReadiness(readiness);
  assertReadinessRequiresContext(model);
  assertLivingProfileApi(livingApi);
  assertEnsureHelper(ensure);
  assertRealtimeReadiness(realtime);
  assertSignupCreatesLivingProfile(signupLp);

  console.log("Practice readiness gate: PASS (code contracts)");
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${url} → ${res.status}: ${String(body).slice(0, 240)}`);
  }
  return body;
}

async function runLiveOrphanCheck() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Live check requires SUPABASE_ACCESS_TOKEN (Supabase management token)."
    );
  }

  const keys = await fetchJson(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { Authorization: `Bearer ${token}` }
  );
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  if (!service) {
    throw new Error("Could not resolve service_role key for live check.");
  }

  const base = `https://${PROJECT_REF}.supabase.co`;
  const headers = {
    Authorization: `Bearer ${service}`,
    apikey: service,
  };

  const profiles = await fetchJson(
    `${base}/rest/v1/profiles?select=id&limit=10000`,
    headers
  );
  const living = await fetchJson(
    `${base}/rest/v1/living_profiles?select=user_id&limit=10000`,
    headers
  );

  const have = new Set(
    (Array.isArray(living) ? living : []).map((row) => row.user_id)
  );
  const missing = (Array.isArray(profiles) ? profiles : []).filter(
    (row) => !have.has(row.id)
  );

  assert.equal(
    missing.length,
    0,
    `profiles without living_profiles: ${missing.length} (sample ids: ${missing
      .slice(0, 5)
      .map((r) => r.id)
      .join(", ")})`
  );

  console.log(
    `Practice readiness live: PASS (${profiles.length} profiles, ${living.length} living_profiles, 0 orphans)`
  );
}

function expectAssertion(fn, label) {
  try {
    fn();
  } catch (err) {
    assert.ok(
      err instanceof assert.AssertionError,
      `${label}: expected AssertionError, got ${err}`
    );
    return;
  }
  assert.fail(`${label}: expected assertion failure`);
}

function runSelfTest() {
  expectAssertion(
    () =>
      assertHomeGate(`
        profile = emptyLivingProfile(user.id, user.displayName);
        setHome(buildAdaptiveHome(profile));
        window.location.assign(\`/app/practice?\${q}\`);
      `),
    "home emptyLivingProfile"
  );

  expectAssertion(
    () =>
      assertHomeGate(`
        profile = data.profile ?? null;
        window.location.assign(\`/app/practice?\${q}\`);
        fetch("/api/living-profile");
      `),
    "home version gate"
  );

  expectAssertion(
    () =>
      assertServerReadiness(`
        const home = buildAdaptiveHome(data ? mapLivingProfileRow(data) : null);
      `),
    "server ensure"
  );

  expectAssertion(
    () =>
      assertEnsureHelper(`
        export async function ensurePersistedLivingProfile() {}
      `),
    "ensure helper contracts"
  );

  console.log("Practice readiness gate: PASS (self-test negatives)");
}

const args = new Set(process.argv.slice(2));
const wantLive =
  args.has("--live") || process.env.PRACTICE_READINESS_LIVE === "1";

if (args.has("--self-test")) {
  runSelfTest();
} else {
  await runCodeContracts();
  if (wantLive) {
    await runLiveOrphanCheck();
  }
}
