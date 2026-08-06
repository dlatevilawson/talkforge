import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import {
  isValidFollowUpForStars,
  normalizeOptionalComment,
} from "@/lib/first-session-feedback";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export const runtime = "nodejs";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
/** “Immediately” started another session — within 30 minutes of first-session check-in. */
const MS_IMMEDIATE = 30 * 60 * 1000;

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
 * Persist once-only first-session check-in, soft dismiss, or internal signals.
 *
 * Body:
 * - Rating: { sessionId, starRating, followUp, optionalComment? }
 * - Dismiss: { sessionId, dismissed: true }
 * - Signal: { action: "signal", kind: "home_visit" | "session_started" | "explored_feature" }
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

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.action === "signal") {
    const kind =
      body.kind === "session_started"
        ? "session_started"
        : body.kind === "explored_feature"
          ? "explored_feature"
          : "home_visit";
    return handleSignal(gate.userId, kind);
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
  const optionalComment = normalizeOptionalComment(body.optionalComment);

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

    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .select("id, user_id, completed_at, started_at, duration_seconds")
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

    const durationSeconds = resolveDurationSeconds(session);

    const row = dismissed
      ? {
          user_id: gate.userId,
          session_id: sessionId,
          star_rating: null,
          follow_up: null,
          optional_comment: null,
          dismissed: true,
          duration_seconds: durationSeconds,
          session_completed: true,
        }
      : {
          user_id: gate.userId,
          session_id: sessionId,
          star_rating: starRating,
          follow_up: followUp,
          optional_comment: optionalComment,
          dismissed: false,
          duration_seconds: durationSeconds,
          session_completed: true,
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

async function handleSignal(
  userId: string,
  kind: "home_visit" | "session_started" | "explored_feature"
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: row, error } = await supabase
      .from("first_session_experience_ratings")
      .select(
        "id, created_at, started_another_session, returned_within_24h, returned_within_7d, explored_another_feature"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      const missing =
        error.code === "42P01" ||
        /does not exist|schema cache/i.test(error.message);
      if (missing) {
        return NextResponse.json({ ok: true, tableReady: false });
      }
      return NextResponse.json({ ok: true });
    }

    if (!row?.created_at) {
      return NextResponse.json({ ok: true, noRow: true });
    }

    const createdAt = new Date(row.created_at).getTime();
    if (Number.isNaN(createdAt)) {
      return NextResponse.json({ ok: true });
    }

    const elapsed = Date.now() - createdAt;
    const patch: Record<string, boolean | string> = {
      signals_updated_at: new Date().toISOString(),
    };

    if (kind === "session_started") {
      if (!row.started_another_session && elapsed <= MS_IMMEDIATE) {
        patch.started_another_session = true;
      }
      if (!row.returned_within_24h && elapsed <= MS_24H) {
        patch.returned_within_24h = true;
      }
      if (!row.returned_within_7d && elapsed <= MS_7D) {
        patch.returned_within_7d = true;
      }
    } else if (kind === "explored_feature") {
      // Curiosity after first session — Profile/Machines, Activity, Progress, etc.
      if (!row.explored_another_feature && elapsed <= MS_7D) {
        patch.explored_another_feature = true;
      }
      if (!row.returned_within_24h && elapsed <= MS_24H) {
        patch.returned_within_24h = true;
      }
      if (!row.returned_within_7d && elapsed <= MS_7D) {
        patch.returned_within_7d = true;
      }
    } else {
      // Home visit / app open after first session.
      if (!row.returned_within_24h && elapsed <= MS_24H) {
        patch.returned_within_24h = true;
      }
      if (!row.returned_within_7d && elapsed <= MS_7D) {
        patch.returned_within_7d = true;
      }
    }

    const flagChanged =
      patch.started_another_session === true ||
      patch.returned_within_24h === true ||
      patch.returned_within_7d === true ||
      patch.explored_another_feature === true;

    if (!flagChanged) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await supabase
      .from("first_session_experience_ratings")
      .update(patch)
      .eq("user_id", userId);

    return NextResponse.json({ ok: true, updated: true });
  } catch (err) {
    console.warn("[first-session-feedback] signal failed", err);
    return NextResponse.json({ ok: true });
  }
}

function resolveDurationSeconds(session: {
  duration_seconds?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
}): number | null {
  if (
    typeof session.duration_seconds === "number" &&
    Number.isFinite(session.duration_seconds) &&
    session.duration_seconds >= 0
  ) {
    return Math.round(session.duration_seconds);
  }
  if (session.started_at && session.completed_at) {
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.completed_at).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      return Math.round((end - start) / 1000);
    }
  }
  return null;
}
