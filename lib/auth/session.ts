import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/auth/constants";
import {
  canAccessApp,
  canAccessFounderPortal,
  hasPermission,
  type Permission,
} from "@/lib/auth/roles";
import {
  mapProfile,
  PROFILE_SELECT,
  type UserProfile,
} from "@/lib/auth/profile";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveEffectiveRole } from "@/lib/auth/allowlist";

export type AuthSession = {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  displayName: string | null;
  profile: UserProfile | null;
};

export async function readSession(): Promise<AuthSession> {
  const empty: AuthSession = {
    authenticated: false,
    userId: null,
    email: null,
    role: null,
    displayName: null,
    profile: null,
  };

  if (!getSupabaseConfigStatus().configured) {
    return empty;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: claimsData, error } = await supabase.auth.getClaims();
    if (error || !claimsData?.claims?.sub) {
      return empty;
    }

    const userId = claimsData.claims.sub as string;
    const email =
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : null;

    const { data: row } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (!row) {
      return {
        authenticated: true,
        userId,
        email,
        role: "user",
        displayName: email?.split("@")[0] ?? "Member",
        profile: null,
      };
    }

    const profile = mapProfile(row);
    const role = resolveEffectiveRole(userId, profile.role);
    return {
      authenticated: true,
      userId,
      email: profile.email || email,
      role,
      displayName: profile.displayName,
      profile: { ...profile, role },
    };
  } catch {
    return empty;
  }
}

export async function requireAuth(nextPath = "/app/dashboard"): Promise<AuthSession> {
  const session = await readSession();
  if (!session.authenticated) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

export async function requirePermission(
  permission: Permission,
  nextPath = "/app/dashboard"
): Promise<AuthSession> {
  const session = await requireAuth(nextPath);
  if (!hasPermission(session.role, permission)) {
    redirect("/app/dashboard");
  }
  return session;
}

export async function requireAppAccess(): Promise<AuthSession> {
  const session = await requireAuth("/app/dashboard");
  if (!canAccessApp(session.role)) {
    redirect("/login");
  }
  if (session.profile?.mustChangePassword) {
    redirect("/change-password?next=/app/dashboard");
  }
  if (session.profile && !session.profile.emailVerified) {
    redirect("/verify-email");
  }
  if (session.profile && !session.profile.onboardingComplete) {
    redirect("/onboarding");
  }
  return session;
}

export async function requireFounderPortal(): Promise<AuthSession> {
  const session = await requireAuth("/founder");
  if (!canAccessFounderPortal(session.role)) {
    redirect("/app/dashboard");
  }
  if (session.profile?.mustChangePassword) {
    redirect("/change-password?next=/founder");
  }
  return session;
}

/** Touch last_login_at after successful sign-in. */
export async function recordLogin(userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // Non-fatal
  }
}
