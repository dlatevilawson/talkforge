/**
 * HARDEN-005 authorization gate.
 *
 * Prevents reintroduction of body-trusted or privileged cloud guest migration
 * while preserving the same-device local reassignment contract.
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const routePath = resolve(root, "app/api/auth/migrate-guest/route.ts");
const clientPath = resolve(root, "lib/auth/migrate-guest.ts");

function assertRetiredRoute(source) {
  assert.match(source, /export async function POST\(\)/);
  assert.match(source, /status:\s*410/);
  assert.match(source, /"Cache-Control":\s*"no-store"/);
  assert.match(source, /Cloud guest migration is retired/);

  for (const [label, pattern] of [
    ["request-body input", /\breq(?:uest)?\b|\.json\(\)/],
    ["client-selected guest id", /\bguestId\b/],
    ["session-derived destination", /\breadSession\b/],
    ["admin client", /createAdminSupabaseClient|adminConfigured/],
    ["database mutation", /\.from\(|\.update\(|\.upsert\(|\.delete\(/],
  ]) {
    assert.doesNotMatch(source, pattern, `retired route regained ${label}`);
  }
}

function assertLocalOnlyClient(source) {
  assert.match(
    source,
    /reassignLocalPracticeData\(guestId,\s*authUserId\)/
  );
  assert.match(source, /clearPendingGuestUserId\(\)/);
  assert.match(source, /remoteMigrated:\s*false/);
  assert.ok(
    source.indexOf("reassignLocalPracticeData(guestId, authUserId)") <
      source.indexOf("clearPendingGuestUserId()"),
    "pending marker must clear after local reassignment"
  );

  for (const [label, pattern] of [
    ["network request", /\bfetch\(/],
    ["retired endpoint reference", /\/api\/auth\/migrate-guest/],
    ["admin client", /createAdminSupabaseClient|adminConfigured/],
    ["database operation", /\.from\(|\.update\(|\.upsert\(|\.delete\(/],
  ]) {
    assert.doesNotMatch(source, pattern, `local migrator regained ${label}`);
  }
}

async function collectTypeScript(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectTypeScript(path, files);
    } else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function assertNoPrivilegedGuestPath(sources) {
  for (const [path, source] of sources) {
    if (
      /createAdminSupabaseClient/.test(source) &&
      /\bguestId\b|guest_/.test(source)
    ) {
      assert.fail(`${path} combines a privileged client with guest identity`);
    }
  }
}

const route = await readFile(routePath, "utf8");
const client = await readFile(clientPath, "utf8");
assertRetiredRoute(route);
assertLocalOnlyClient(client);

const applicationFiles = [
  ...(await collectTypeScript(resolve(root, "app"))),
  ...(await collectTypeScript(resolve(root, "lib"))),
];
const applicationSources = new Map(
  await Promise.all(
    applicationFiles.map(async (path) => [path, await readFile(path, "utf8")])
  )
);
assertNoPrivilegedGuestPath(applicationSources);

console.log(
  `Guest migration authorization: PASS (${applicationFiles.length} application files scanned)`
);

if (process.argv.includes("--self-test")) {
  assert.throws(
    () =>
      assertRetiredRoute(
        `${route}\nasync function exploit(req) { const guestId = (await req.json()).guestId; return createAdminSupabaseClient().from("profiles").delete().eq("id", guestId); }`
      ),
    /retired route regained/
  );
  assert.throws(
    () =>
      assertLocalOnlyClient(
        `${client}\nfetch("/api/auth/migrate-guest", { body: guestId });`
      ),
    /local migrator regained/
  );
  assert.throws(
    () =>
      assertNoPrivilegedGuestPath(
        new Map([
          [
            "synthetic.ts",
            'const admin = createAdminSupabaseClient(); const guestId = "guest_*";',
          ],
        ])
      ),
    /combines a privileged client/
  );
  console.log("Guest migration authorization negative tests: PASS");
}
