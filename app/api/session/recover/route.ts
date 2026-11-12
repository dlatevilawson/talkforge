import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recoverIncompleteSession } from "@/lib/session-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.sessionId !== "string" || !body.sessionId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    return NextResponse.json(await recoverIncompleteSession(body.sessionId, user.id));
  } catch (error) {
    console.error("[session] recovery failed", error);
    return NextResponse.json({ error: "recovery_failed" }, { status: 500 });
  }
}
