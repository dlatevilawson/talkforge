import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/auth/constants";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PROFILE_SELECT, mapProfile } from "@/lib/auth/profile";
import { adminConfigured, createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Supabase Auth callback — email verification, password recovery, future OAuth.
 * Supports:
 * - PKCE `?code=` exchange
 * - Email `?token_hash=&type=` verify (branded templates / mobile-safe links)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/onboarding";
  const site = getSiteUrl() || origin;

  if (!getSupabaseConfigStatus().configured) {
    return NextResponse.redirect(`${site}/login?error=auth_unavailable`);
  }

  const supabase = await createServerSupabaseClient();

  if (tokenHash && typeParam) {
    const type = typeParam as EmailOtpType;
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      console.error("auth/callback verifyOtp", error.message);
      return NextResponse.redirect(`${site}/login?error=auth_callback`);
    }
    await finalizeVerifiedUser(supabase);
    if (type === "recovery") {
      return NextResponse.redirect(`${site}/reset-password`);
    }
    return NextResponse.redirect(`${site}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await finalizeVerifiedUser(supabase);
      if (next.startsWith("/reset-password")) {
        return NextResponse.redirect(`${site}/reset-password`);
      }
      return NextResponse.redirect(`${site}${next}`);
    }
    console.error("auth/callback exchangeCode", error.message);
  }

  return NextResponse.redirect(`${site}/login?error=auth_callback`);
}

async function finalizeVerifiedUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  await ensureProfileAfterVerify(user.id, user.email ?? "", {
    firstName: String(user.user_metadata?.first_name ?? ""),
    lastName: String(user.user_metadata?.last_name ?? ""),
    displayName: String(
      user.user_metadata?.display_name ??
        [user.user_metadata?.first_name, user.user_metadata?.last_name]
          .filter(Boolean)
          .join(" ")
    ),
    role: String(user.user_metadata?.role ?? "user"),
    mustChangePassword: Boolean(user.user_metadata?.must_change_password),
  });
}

async function ensureProfileAfterVerify(
  userId: string,
  email: string,
  meta: {
    firstName: string;
    lastName: string;
    displayName: string;
    role: string;
    mustChangePassword: boolean;
  }
) {
  const payload = {
    id: userId,
    email,
    first_name: meta.firstName,
    last_name: meta.lastName,
    display_name:
      meta.displayName ||
      [meta.firstName, meta.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Member",
    email_verified: true,
    account_status: "active",
    role: ["guest", "user", "premium", "founder", "admin", "system"].includes(
      meta.role
    )
      ? meta.role
      : "user",
    must_change_password: meta.mustChangePassword,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("profiles")
        .update({
          email_verified: true,
          account_status: "active",
          email,
          first_name: meta.firstName || existing.first_name,
          last_name: meta.lastName || existing.last_name,
          display_name:
            meta.displayName || mapProfile(existing).displayName,
        })
        .eq("id", userId);
      return;
    }

    const { error } = await supabase.from("profiles").upsert(payload);
    if (error && adminConfigured()) {
      const admin = createAdminSupabaseClient();
      await admin.from("profiles").upsert(payload);
    }
  } catch (err) {
    console.error("ensureProfileAfterVerify", err);
  }
}
