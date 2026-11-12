import { NextResponse } from "next/server";
import { authorizeForgeAgentCron } from "@/lib/forge-agent/cron-auth";
import { adminConfigured, createAdminSupabaseClient } from "@/lib/supabase/admin";
import { recoverStaleIncompleteSessions } from "@/lib/session-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeForgeAgentCron(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
  try {
    const results = await recoverStaleIncompleteSessions(createAdminSupabaseClient());
    return NextResponse.json({ ok: true, recovered: results.length, results });
  } catch (error) {
    console.error("[session] stale recovery failed", error);
    return NextResponse.json({ error: "recovery_failed" }, { status: 500 });
  }
}
