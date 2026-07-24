import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown };
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 64)
        : "landing";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Waitlist is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    const { error } = await supabase.from("waitlist_members").insert({
      email,
      source,
    });

    if (error) {
      // Unique violation → already a founding member
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyJoined: true });
      }
      console.error("waitlist insert", error.message);
      return NextResponse.json(
        { error: "Could not join the waitlist. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("waitlist", err);
    return NextResponse.json(
      { error: "Could not join the waitlist. Please try again." },
      { status: 500 }
    );
  }
}
