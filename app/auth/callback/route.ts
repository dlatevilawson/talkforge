import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/auth/constants";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PROFILE_SELECT, mapProfile } from "@/lib/auth/profile";
import { adminConfigured, createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Supabase Auth callback — email verification, password recovery, future OAuth.
 * Creates / activates the profile after successful verification.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/onboarding";
  const site = getSiteUrl() || origin;

  if (!getSupabaseConfigStatus().configured) {
    return NextResponse.redirect(`${site}/login?error=auth_unavailable`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
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
          mustChangePassword: Boolean(
            user.user_metadata?.must_change_password
          ),
        });
      }

      if (next.startsWith("/reset-password")) {
        return NextResponse.redirect(`${site}/reset-password`);
      }

      return NextResponse.redirect(`${site}${next}`);
    }
  }

  return NextResponse.redirect(`${site}/login?error=auth_callback`);
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
            meta.displayName ||
            mapProfile(existing).displayName,
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
