import { NextResponse } from "next/server";
import {
  clearSession,
  founderDevEnabled,
  readSession,
  verifyFounderDevCredentials,
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
  if (!supabase) {
    // Cookie session still works without Supabase for route protection.
    return;
  }
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      displayName?: string;
      email?: string;
      password?: string;
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
      const name =
        typeof body.displayName === "string" && body.displayName.trim()
          ? body.displayName.trim()
          : "Member";
      // Prefer continuing an existing browser pointer when client sends it.
      const userId =
        typeof body.userId === "string" && body.userId.trim()
          ? body.userId.trim()
          : createId();
      const createdAt = new Date().toISOString();
      await upsertProfile({ id: userId, displayName: name, createdAt });
      await writeSession({
        userId,
        role: "member",
        displayName: name,
      });
      return NextResponse.json({
        ok: true,
        userId,
        role: "member",
        displayName: name,
      });
    }

    if (body.action === "founder") {
      if (!founderDevEnabled()) {
        return NextResponse.json(
          {
            error:
              "Founder development login is disabled. Set FOUNDER_DEV_ENABLED=true only in trusted environments.",
          },
          { status: 403 }
        );
      }
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!verifyFounderDevCredentials(email, password)) {
        return NextResponse.json(
          { error: "Invalid Founder credentials." },
          { status: 401 }
        );
      }

      const founderId = process.env.FOUNDER_DEV_USER_ID?.trim() || "founder-dev";
      const displayName =
        process.env.FOUNDER_DEV_DISPLAY_NAME?.trim() || "Founder";
      const createdAt = new Date().toISOString();
      try {
        await upsertProfile({
          id: founderId,
          displayName,
          createdAt,
        });
      } catch (err) {
        console.warn("founder profile upsert", err);
      }
      await writeSession({
        userId: founderId,
        role: "founder",
        displayName,
      });
      return NextResponse.json({
        ok: true,
        userId: founderId,
        role: "founder",
        displayName,
        warning:
          "FOUNDER_DEV login — development-safe seed. Do not treat as production IAM.",
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
