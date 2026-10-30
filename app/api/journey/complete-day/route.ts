import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.programId !== "string" || typeof body.drillId !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const admin = createAdminSupabaseClient();
  const { data: program } = await admin.from("training_programs").select("id").eq("id", body.programId).eq("member_id", user.id).maybeSingle();
  if (!program) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: day, error } = await admin.from("program_days").select("id").eq("program_id", body.programId).eq("drill_id", body.drillId).eq("status", "pending").order("day_index").limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!day) return NextResponse.json({ ok: true, alreadyComplete: true });
  const completedAt = typeof body.completedAt === "string" ? body.completedAt : new Date().toISOString();
  const { error: updateError } = await admin.from("program_days").update({ status: "done", completed_at: completedAt }).eq("id", day.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  const { error: completionError } = await admin.from("drill_completions").upsert({
    day_id: day.id,
    member_id: user.id,
    drill_id: body.drillId,
    practice_session_id: typeof body.sessionId === "string" ? body.sessionId : null,
    completed_at: completedAt,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
  }, { onConflict: "member_id,drill_id,practice_session_id" });
  if (completionError) return NextResponse.json({ error: completionError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

