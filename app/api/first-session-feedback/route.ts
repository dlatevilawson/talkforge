import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { isValidFollowUpForStars } from "@/lib/first-session-feedback";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export const runtime = "nodejs";

/** Whether this member already completed or dismissed the first-session check-in. */
export async function GET() {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!getSupabaseConfigStatus().configured) {
    return NextResponse.json({ completed: false, tableReady: false });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("first_session_experience_ratings")
      .select("id")
      .eq("user_id", gate.userId)
      .maybeSingle();

    if (error) {
      // Table may not be migrated yet — fail open so UX can use local once-flag.
      const missing =
        error.code === "42P01" ||
        /does not exist|schema cache/i.test(error.message);
      if (missing) {
        return NextResponse.json({ completed: false, tableReady: false });
      }
      console.warn("[first-session-feedback] GET", error.message);
      return NextResponse.json({ completed: false, tableReady: true });
    }

    return NextResponse.json({
      completed: Boolean(data?.id),
      tableReady: true,
    });
  } catch (err) {
    console.warn("[first-session-feedback] GET failed", err);
    return NextResponse.json({ completed: false, tableReady: false });
  }
}

/**
 * Persist once-only first-session experience rating (or soft dismiss).
 * Body: { sessionId, starRating?, followUp?, dismissed? }
 */
export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!getSupabaseConfigStatus().configured) {
    return NextResponse.json(
      { error: "Storage unavailable." },
      { status: 503 }
    );
  }

  let body: {
    sessionId?: unknown;
    starRating?: unknown;
    followUp?: unknown;
    dismissed?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required." },
      { status: 400 }
    );
  }

  const dismissed = body.dismissed === true;
  const starRating =
    typeof body.starRating === "number" && Number.isInteger(body.starRating)
      ? body.starRating
      : null;
  const followUp =
    typeof body.followUp === "string" && body.followUp.trim()
      ? body.followUp.trim()
      : null;

  if (dismissed) {
    // Soft dismiss — still once-only.
  } else if (
    starRating == null ||
    starRating < 1 ||
    starRating > 5 ||
    !followUp ||
    !isValidFollowUpForStars(starRating, followUp)
  ) {
    return NextResponse.json(
      { error: "A star rating and valid follow-up are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Ensure the session belongs to this member.
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("id, user_id, completed_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session || session.user_id !== gate.userId) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    if (!session.completed_at) {
      return NextResponse.json(
        { error: "Session is not complete yet." },
        { status: 409 }
      );
    }

    const row = dismissed
      ? {
          user_id: gate.userId,
          session_id: sessionId,
          star_rating: null,
          follow_up: null,
          dismissed: true,
        }
      : {
          user_id: gate.userId,
          session_id: sessionId,
          star_rating: starRating,
          follow_up: followUp,
          dismissed: false,
        };

    const { error: insertError } = await supabase
      .from("first_session_experience_ratings")
      .upsert(row, { onConflict: "user_id", ignoreDuplicates: true });

    if (insertError) {
      const missing =
        insertError.code === "42P01" ||
        /does not exist|schema cache/i.test(insertError.message);
      if (missing) {
        return NextResponse.json(
          { error: "First-session feedback storage is not ready yet." },
          { status: 503 }
        );
      }
      // Unique violation = already completed — treat as success (idempotent).
      if (insertError.code === "23505") {
        return NextResponse.json({ ok: true, alreadyCompleted: true });
      }
      console.error("[first-session-feedback] POST", insertError.message);
      return NextResponse.json(
        { error: "Could not save feedback." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[first-session-feedback] POST failed", err);
    return NextResponse.json(
      { error: "Could not save feedback." },
      { status: 500 }
    );
  }
}
