import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";
import type { UserRole } from "@/lib/auth/constants";
import { resolveEffectiveRole } from "@/lib/auth/allowlist";
import {
  canAccessApp,
  canAccessFounderPortal,
  isValidRole,
} from "@/lib/auth/roles";

/**
 * Refresh Supabase Auth cookies and enforce route authorization.
 * Uses getClaims() to validate JWT signatures (never trust getSession alone).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return guardWithoutSupabase(request, supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([headerKey, value]) =>
          supabaseResponse.headers.set(headerKey, value)
        );
      },
    },
  });

  // IMPORTANT: do not insert logic between createServerClient and getClaims.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  const { pathname } = request.nextUrl;
  const needsAuth =
    pathname.startsWith("/founder") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/change-password");

  if (!needsAuth) {
    return supabaseResponse;
  }

  if (!userId) {
    // Single production auth system: members → signup, staff areas → login.
    // Founder Portal is NOT a separate login — role is checked after auth.
    const dest =
      pathname.startsWith("/founder") ||
      pathname.startsWith("/change-password") ||
      pathname.startsWith("/onboarding")
        ? "/login"
        : "/signup";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dest;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, account_status, must_change_password, email_verified, onboarding_complete"
    )
    .eq("id", userId)
    .maybeSingle();

  const roleRaw = profile?.role;
  const baseRole: UserRole =
    typeof roleRaw === "string" && isValidRole(roleRaw) ? roleRaw : "user";
  const role = resolveEffectiveRole(userId, baseRole);

  if (
    profile?.must_change_password &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/logout")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/change-password";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/change-password")) {
    return supabaseResponse;
  }

  if (
    profile &&
    !profile.email_verified &&
    !pathname.startsWith("/verify-email")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/verify-email";
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      redirectUrl.searchParams.set("email", user.email);
    }
    redirectUrl.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/founder")) {
    if (!canAccessFounderPortal(role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/onboarding")) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/app")) {
    if (!canAccessApp(role) || profile?.account_status === "suspended") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Missing profile row must not skip onboarding (broken signup trigger).
    if (!profile || !profile.onboarding_complete) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/onboarding";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

function guardWithoutSupabase(
  request: NextRequest,
  fallback: NextResponse
): NextResponse {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/founder") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/change-password")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    redirectUrl.searchParams.set("error", "auth_unavailable");
    return NextResponse.redirect(redirectUrl);
  }
  return fallback;
}
