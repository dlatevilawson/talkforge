import { NextResponse } from "next/server";
import {
  clearSession,
  founderDevAllowed,
  founderDevDisplayName,
  founderDevUserId,
  readSession,
  resolveUserRole,
  writeSession,
} from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/client";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function upsertProfile(input: {
  id: string;
  displayName: string;
  createdAt: string;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert({
    id: input.id,
    display_name: input.displayName,
    created_at: input.createdAt,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function GET() {
  const session = await readSession();
  return NextResponse.json(session);
}

/**
 * Shared auth for members and Founder.
 * Role is resolved from FOUNDER_USER_IDS (or locked-down local Founder seed) —
 * never a separate login action.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      displayName?: string;
      userId?: string;
    };

    if (body.action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    if (
      body.action === "guest" ||
      body.action === "signup" ||
      body.action === "login"
    ) {
      let name =
        typeof body.displayName === "string" && body.displayName.trim()
          ? body.displayName.trim()
          : "Member";

      let userId =
        typeof body.userId === "string" && body.userId.trim()
          ? body.userId.trim()
          : createId();

      // Local/dev only: signing in with the Founder display name uses the
      // stable Founder seed id so FOUNDER_USER_IDS / portal checks stay consistent.
      if (
        founderDevAllowed() &&
        name.toLowerCase() === founderDevDisplayName().toLowerCase()
      ) {
        userId = founderDevUserId();
        name = founderDevDisplayName();
      }

      const createdAt = new Date().toISOString();
      await upsertProfile({ id: userId, displayName: name, createdAt });

      const role = resolveUserRole({ userId, displayName: name });
      await writeSession({ userId, role, displayName: name });

      return NextResponse.json({
        ok: true,
        userId,
        role,
        displayName: name,
        ...(role === "founder" && founderDevAllowed()
          ? {
              warning:
                "Founder role via development seed. Production uses FOUNDER_USER_IDS only.",
            }
          : {}),
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("auth/session", err);
    return NextResponse.json(
      { error: "Could not update session." },
      { status: 500 }
    );
  }
}
