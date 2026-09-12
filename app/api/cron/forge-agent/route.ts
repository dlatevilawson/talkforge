import { NextResponse } from "next/server";
import { authorizeForgeAgentCron } from "@/lib/forge-agent/cron-auth";
import { runForgeAgentCron } from "@/lib/forge-agent/cron";
import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeForgeAgentCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Service role is not configured." },
      { status: 503 }
    );
  }

  const result = await runForgeAgentCron(createAdminSupabaseClient());
  return NextResponse.json({
    status: result.status,
    recovered: result.metrics.recovered,
    claimed: result.metrics.claimed,
    generated: result.metrics.generated,
    fallbacks: result.metrics.fallbacks,
  });
}
