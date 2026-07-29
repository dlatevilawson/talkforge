/**
 * Configure Supabase Auth Site URL, redirect allowlist, and TalkForge email templates.
 *
 * Requires: SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 * Optional: SUPABASE_PROJECT_REF (defaults to TalkForge project)
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/configure-supabase-auth.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF?.trim() || "wudjmxqbsozreepgjvef";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const SITE = "https://talkforge.io";

if (!TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

function loadHtml(name) {
  const path = resolve("supabase/email-templates", name);
  return readFileSync(path, "utf8").trim();
}

const confirmationHtml = loadHtml("verification.html");
const recoveryHtml = loadHtml("password-reset.html");
const inviteHtml = loadHtml("welcome.html");

const payload = {
  site_url: SITE,
  uri_allow_list: [
    `${SITE}`,
    `${SITE}/**`,
    `${SITE}/auth/callback`,
    `${SITE}/auth/callback/**`,
    `http://localhost:3000/**`,
  ].join(","),
  mailer_subjects_confirmation: "Welcome to TalkForge — Verify Your Email",
  mailer_templates_confirmation_content: confirmationHtml,
  mailer_subjects_recovery: "Reset Your TalkForge Password",
  mailer_templates_recovery_content: recoveryHtml,
  mailer_subjects_invite: "Welcome to TalkForge",
  mailer_templates_invite_content: inviteHtml,
  mailer_subjects_magic_link: "Your TalkForge sign-in link",
  mailer_subjects_email_change: "Confirm your TalkForge email change",
};

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error("Failed to update Auth config:", res.status, text);
  process.exit(1);
}

console.log("Supabase Auth configured for", SITE);
console.log("- site_url + redirect allowlist");
console.log("- confirmation / recovery / invite email templates (TalkForge branded)");
