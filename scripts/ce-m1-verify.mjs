#!/usr/bin/env node
/**
 * CE-M1 verification — server-side ephemeral session mint (no WebRTC).
 * Usage: node scripts/ce-m1-verify.mjs
 * Optional: CE_M1_BASE=http://localhost:3000 node scripts/ce-m1-verify.mjs --via-app
 */

const viaApp = process.argv.includes("--via-app");
const base = process.env.CE_M1_BASE || "http://localhost:3000";

async function verifyDirect() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1",
        instructions:
          "You are a TalkForge interviewer. When session begins, greet briefly.",
        audio: { output: { voice: "marin" } },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.value?.startsWith("ek_")) {
    throw new Error(`Direct mint failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return {
    path: "direct_client_secrets",
    ok: true,
    session_id: data.session?.id ?? null,
    model: data.session?.model ?? null,
    expires_at: data.expires_at ?? null,
    key_prefix: String(data.value).slice(0, 6),
  };
}

async function verifyViaApp() {
  const res = await fetch(`${base}/api/realtime/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track: "hello" }),
  });
  const data = await res.json();
  if (!res.ok || !data.value?.startsWith("ek_")) {
    throw new Error(`App mint failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return {
    path: "app_api_realtime_session",
    ok: true,
    session_id: data.session_id ?? null,
    model: data.model ?? null,
    expires_at: data.expires_at ?? null,
    key_prefix: String(data.value).slice(0, 6),
    milestone: data.milestone ?? null,
  };
}

const result = viaApp ? await verifyViaApp() : await verifyDirect();
console.log(JSON.stringify({ milestone: "CE-M1", ...result }, null, 2));
