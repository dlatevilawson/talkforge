import { NextResponse } from "next/server";
import { activateAssistantCoachProfile } from "@/lib/assistant-coach/activation";
import { createActivationLivingProfileStore } from "@/lib/assistant-coach/activation-server";
import { hashAnonSecret } from "@/lib/assistant-coach/anon-secret";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "@/lib/assistant-coach/anon-cookie";
import { requireAssistantCoachAnonCookieSecret } from "@/lib/assistant-coach/config";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/coach/activate", request.url)
    );
  }

  try {
    const secret = requireAssistantCoachAnonCookieSecret();
    const cookie = readCookieFromHeader(
      request.headers.get("cookie"),
      ASSISTANT_COACH_ANON_COOKIE_NAME
    );
    const parsed = parseAnonCookieValue(cookie, secret);
    const result = await activateAssistantCoachProfile({
      repository: createSupabaseAssistantCoachSessionRepository(),
      profiles: createActivationLivingProfileStore(supabase, user),
      anonKeyHash: parsed.ok ? hashAnonSecret(parsed.rawSecret) : null,
      userId: user.id,
    });
    const response = NextResponse.redirect(
      new URL(result.destination, request.url)
    );
    response.cookies.set(ASSISTANT_COACH_ANON_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.warn(
      "coach activation failed",
      error instanceof Error ? error.name : "unknown"
    );
    return NextResponse.redirect(new URL("/coach?activation=retry", request.url));
  }
}
