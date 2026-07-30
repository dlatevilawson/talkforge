#!/usr/bin/env node
/**
 * Provision (or elevate) a Founder Portal login in Supabase Auth.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FOUNDER_EMAIL          (defaults to founder@talkforge.io)
 *   FOUNDER_PASSWORD       (required, min 8 chars)
 *
 * Usage:
 *   FOUNDER_EMAIL=you@example.com FOUNDER_PASSWORD='••••••••' \
 *     node scripts/seed-founder.mjs
 *
 * Never commit passwords. For production elevation of an existing user,
 * you can also set FOUNDER_USER_IDS=<auth-uuid> on Vercel.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (
  process.env.FOUNDER_EMAIL ||
  process.env.FOUNDER_DEV_EMAIL ||
  "founder@talkforge.io"
)
  .trim()
  .toLowerCase();
const password =
  process.env.FOUNDER_PASSWORD || process.env.FOUNDER_DEV_PASSWORD || "";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error(
    "Set FOUNDER_PASSWORD (or FOUNDER_DEV_PASSWORD) to at least 8 characters."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

const profileRow = (userId) => ({
  id: userId,
  email,
  first_name: "Founder",
  last_name: "TalkForge",
  display_name: "Founder",
  email_verified: true,
  account_status: "active",
  role: "founder",
  must_change_password: false,
  onboarding_complete: true,
});

const existing = await findUserByEmail(email);

if (existing) {
  const { error: pwError } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      display_name: "Founder",
    },
    app_metadata: {
      ...(existing.app_metadata ?? {}),
      role: "founder",
    },
  });
  if (pwError) {
    console.error("Failed to update Founder auth user:", pwError.message);
    process.exit(1);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profileRow(existing.id));
  if (profileError) {
    console.error("Failed to upsert Founder profile:", profileError.message);
    process.exit(1);
  }

  console.log("Updated Founder login.");
  console.log(`  email: ${email}`);
  console.log(`  userId: ${existing.id}`);
  console.log(`  portal: /login/founder → /founder`);
  console.log(`  tip: set FOUNDER_USER_IDS=${existing.id} on Vercel as backup elevation`);
  process.exit(0);
}

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: "Founder" },
  app_metadata: { role: "founder", provider: "email" },
});

if (error || !data.user) {
  console.error("Failed to create Founder auth user:", error?.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from("profiles")
  .upsert(profileRow(data.user.id));
if (profileError) {
  console.error("Auth user created but profile upsert failed:", profileError.message);
  console.error(`  userId: ${data.user.id}`);
  process.exit(1);
}

console.log("Created Founder login.");
console.log(`  email: ${email}`);
console.log(`  userId: ${data.user.id}`);
console.log(`  portal: /login/founder → /founder`);
console.log(`  tip: set FOUNDER_USER_IDS=${data.user.id} on Vercel as backup elevation`);
