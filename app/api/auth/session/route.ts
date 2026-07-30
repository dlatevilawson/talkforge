import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

/** Session status for client shells (AppShell, LandingNav). */
export async function GET() {
  const session = await readSession();
  return NextResponse.json({
    authenticated: session.authenticated,
    userId: session.userId,
    email: session.email,
    role: session.role,
    displayName: session.displayName,
    profile: session.profile
      ? {
          onboardingComplete: session.profile.onboardingComplete,
          mustChangePassword: session.profile.mustChangePassword,
          emailVerified: session.profile.emailVerified,
          accountStatus: session.profile.accountStatus,
        }
      : null,
  });
}

/** Logout via API (used by AppShell). Prefer /logout route for full navigations. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === "logout" && getSupabaseConfigStatus().configured) {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
