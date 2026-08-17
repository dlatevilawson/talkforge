/**
 * Phase 4B.3 — mint / restore anonymous Assistant Coach session + cookie.
 * No turn API, LLM, or UI.
 */
import { NextResponse } from "next/server";
import {
  AssistantCoachConfigError,
  requireAssistantCoachAnonCookieSecret,
} from "@/lib/assistant-coach/config";
import { ASSISTANT_COACH_ANON_COOKIE_NAME } from "@/lib/assistant-coach/anon-cookie";
import { ensureAnonAssistantCoachSession } from "@/lib/assistant-coach/session-service";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function handleSession(request: Request): Promise<NextResponse> {
  try {
    if (!adminConfigured()) {
      return NextResponse.json(
        { error: "Assistant Coach session store is not configured." },
        { status: 503 }
      );
    }

    let cookieSecret: string;
    try {
      cookieSecret = requireAssistantCoachAnonCookieSecret();
    } catch (err) {
      if (err instanceof AssistantCoachConfigError) {
        return NextResponse.json({ error: err.message }, { status: 503 });
      }
      throw err;
    }

    const repository = createSupabaseAssistantCoachSessionRepository();
    const result = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret,
      cookieHeader: request.headers.get("cookie"),
    });

    const response = NextResponse.json(
      {
        session: result.publicSession,
      },
      { status: 200 }
    );

    response.cookies.set(ASSISTANT_COACH_ANON_COOKIE_NAME, result.sealedCookie, {
      httpOnly: result.cookieAttributes.httpOnly,
      secure: result.cookieAttributes.secure,
      sameSite: result.cookieAttributes.sameSite,
      path: result.cookieAttributes.path,
      maxAge: result.cookieAttributes.maxAge,
    });

    return response;
  } catch (err) {
    console.error("assistant-coach session mint/restore failed", err);
    return NextResponse.json(
      { error: "Unable to establish Assistant Coach session." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleSession(request);
}

export async function POST(request: Request) {
  return handleSession(request);
}
