import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { adminConfigured, createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Reassign cloud practice rows from a legacy guest_* user id to the
 * authenticated member. Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 */
export async function POST(req: Request) {
  const session = await readSession();
  if (!session.authenticated || !session.userId) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { guestId?: string };
  const guestId = typeof body.guestId === "string" ? body.guestId.trim() : "";

  if (!guestId.startsWith("guest_")) {
    return NextResponse.json(
      { ok: false, message: "Invalid guest id." },
      { status: 400 }
    );
  }

  if (guestId === session.userId) {
    return NextResponse.json({ ok: true, migrated: false });
  }

  if (!adminConfigured()) {
    return NextResponse.json({
      ok: true,
      migrated: false,
      message: "Service role unavailable; local practice data still migrates client-side.",
    });
  }

  try {
    const admin = createAdminSupabaseClient();
    const authUserId = session.userId;

    // Practice tables may be uuid-typed (auth foundation) or text (legacy).
    // Best-effort updates; ignore schema mismatch errors.
    const updates: Array<PromiseLike<{ error: { message: string } | null }>> = [
      admin
        .from("practice_sessions")
        .update({ user_id: authUserId })
        .eq("user_id", guestId),
      admin
        .from("reflections")
        .update({ user_id: authUserId })
        .eq("user_id", guestId),
    ];

    const results = await Promise.all(updates);
    const hardError = results.find(
      (r) => r.error && !/invalid input syntax|type/i.test(r.error.message)
    );
    if (hardError?.error) {
      return NextResponse.json(
        { ok: false, message: hardError.error.message },
        { status: 500 }
      );
    }

    // Legacy guest profile row (text id) — delete if present.
    await admin.from("profiles").delete().eq("id", guestId);

    return NextResponse.json({ ok: true, migrated: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : "Guest migration failed.",
      },
      { status: 500 }
    );
  }
}
