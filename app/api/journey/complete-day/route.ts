import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSubstantiveFounderSpeech } from "@/lib/session-substance";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.drillId !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const hasSession = typeof body.sessionId === "string" && body.sessionId.length > 0;
  if (!hasSession && body.textOnly !== true) {
    return NextResponse.json({ error: "spoken_rep_required" }, { status: 400 });
  }
  const admin = createAdminSupabaseClient();
  const completedAt = typeof body.completedAt === "string" ? body.completedAt : new Date().toISOString();
  let day: { id: string } | null = null;
  if (typeof body.programId === "string") {
    const { data: program } = await admin.from("training_programs").select("id").eq("id", body.programId).eq("member_id", user.id).maybeSingle();
    if (!program) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { data: pending, error } = await admin.from("program_days").select("id").eq("program_id", body.programId).eq("drill_id", body.drillId).eq("status", "pending").order("day_index").limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (pending) {
      day = pending;
    } else {
      const { data: done, error: doneError } = await admin.from("program_days").select("id").eq("program_id", body.programId).eq("drill_id", body.drillId).eq("status", "done").order("day_index", { ascending: false }).limit(1).maybeSingle();
      if (doneError) return NextResponse.json({ error: doneError.message }, { status: 500 });
      day = done;
    }
  }
  if (hasSession) {
    const [{ data: session, error: sessionError }, { data: audio, error: audioError }] = await Promise.all([
      admin.from("practice_sessions").select("id,turns").eq("id", body.sessionId).eq("user_id", user.id).maybeSingle(),
      admin.from("speech_audio").select("session_id").eq("session_id", body.sessionId).eq("user_id", user.id).maybeSingle(),
    ]);
    if (sessionError || audioError) {
      return NextResponse.json({ error: sessionError?.message ?? audioError?.message ?? "session_lookup_failed" }, { status: 500 });
    }
    if (!session) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    const hasSubstantiveTurns = hasSubstantiveFounderSpeech(Array.isArray(session.turns) ? session.turns : []);
    if (!hasSubstantiveTurns && !audio) {
      return NextResponse.json({ ok: true, captured: false });
    }
  }
  const { error: completionError } = await admin.from("drill_completions").upsert({
    day_id: day?.id ?? null,
    member_id: user.id,
    drill_id: body.drillId,
    practice_session_id: typeof body.sessionId === "string" ? body.sessionId : null,
    completed_at: completedAt,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
  }, { onConflict: "member_id,drill_id,practice_session_id" });
  if (completionError) return NextResponse.json({ error: completionError.message }, { status: 500 });
  if (day) {
    const { error: updateError } = await admin.from("program_days").update({ status: "done", completed_at: completedAt }).eq("id", day.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

