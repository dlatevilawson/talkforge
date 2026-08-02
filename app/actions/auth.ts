"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authCallbackUrl } from "@/lib/auth/constants";
import { logAuthEvent } from "@/lib/auth/analytics";
import {
  founderDevConfigured,
  founderDevEmail,
  founderDevPassword,
} from "@/lib/auth/founder-dev";
import { AUTH_COPY, mapAuthError } from "@/lib/auth/messages";
import { assertPasswordPolicy } from "@/lib/auth/password";
import { founderUserIdAllowlist, resolveEffectiveRole } from "@/lib/auth/allowlist";
import type { UserRole } from "@/lib/auth/constants";
import { canAccessFounderPortal, isValidRole } from "@/lib/auth/roles";
import { recordLogin } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/safe-next";
import {
  checkRateLimit,
  clientKeyFromHeaders,
} from "@/lib/auth/rate-limit";
import { validateEmail, validateSignup } from "@/lib/auth/validate";
import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthActionState = {
  ok?: boolean;
  message?: string;
  email?: string;
  redirectTo?: string;
  errors?: Record<string, string>;
};

function authUnavailable(): AuthActionState {
  return {
    ok: false,
    message: "Authentication is temporarily unavailable.",
  };
}

async function rateLimitOrError(
  action: string
): Promise<AuthActionState | null> {
  const h = await headers();
  const key = `${action}:${clientKeyFromHeaders(h)}`;
  const result = checkRateLimit(key, 8, 60_000);
  if (!result.ok) {
    return {
      ok: false,
      message: "Too many attempts. Please wait a moment and try again.",
    };
  }
  return null;
}

/** Ensure development Founder account exists (env-gated, never in production). */
async function ensureFounderDevAccount(): Promise<void> {
  if (!founderDevConfigured() || !adminConfigured()) return;

  const email = founderDevEmail();
  const password = founderDevPassword();
  const admin = createAdminSupabaseClient();

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existing) {
    await admin.from("profiles").upsert({
      id: existing.id,
      email,
      first_name: "Founder",
      last_name: "TalkForge",
      display_name: "Founder",
      email_verified: true,
      account_status: "active",
      role: "founder",
      must_change_password: true,
      onboarding_complete: true,
    });
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "Founder",
      must_change_password: true,
    },
    app_metadata: {
      role: "founder",
      provider: "email",
    },
  });

  if (error) {
    console.error("founder-dev seed", error.message);
    return;
  }

  if (data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      first_name: "Founder",
      last_name: "TalkForge",
      display_name: "Founder",
      email_verified: true,
      account_status: "active",
      role: "founder",
      must_change_password: true,
      onboarding_complete: true,
    });
  }
}

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("signup");
  if (limited) return limited;

  const parsed = validateSignup({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  });

  if (!parsed.ok || !parsed.data) {
    logAuthEvent("auth_signup_failure", { reason: "validation" });
    return {
      ok: false,
      errors: parsed.errors,
      message: "Please fix the highlighted fields.",
    };
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authCallbackUrl("/onboarding"),
      data: {
        display_name: displayName || email.split("@")[0] || "Member",
        auth_provider: "email",
      },
    },
  });

  if (error) {
    logAuthEvent("auth_signup_failure", { reason: error.message });
    return {
      ok: false,
      message: mapAuthError(
        error,
        "Could not create your account. Please try again."
      ),
    };
  }

  logAuthEvent("auth_signup_success");
  return {
    ok: true,
    message: AUTH_COPY.signupSuccess,
    email,
  };
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("login");
  if (limited) return limited;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const portal = String(formData.get("portal") ?? "app");
  const defaultNext = portal === "founder" ? "/founder" : "/app";
  const next = safeNextPath(String(formData.get("next") ?? ""), defaultNext);
  const remember = String(formData.get("remember") ?? "") === "on";

  const emailErr = validateEmail(email);
  if (emailErr || !password) {
    logAuthEvent("auth_login_failure", { reason: "invalid_input" });
    return {
      ok: false,
      message: "Incorrect email or password.",
    };
  }

  // Seed Founder before login attempt when local bootstrap is enabled.
  if (founderDevConfigured() && email === founderDevEmail()) {
    await ensureFounderDevAccount();
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    logAuthEvent("auth_login_failure", { reason: error?.message ?? "unknown" });
    return {
      ok: false,
      message: mapAuthError(error, "Incorrect email or password."),
    };
  }

  await recordLogin(data.user.id);

  // Persist remember preference (session longevity is handled by Supabase refresh tokens;
  // preference is stored for future policy / client UX).
  if (remember) {
    try {
      const { cookies } = await import("next/headers");
      const jar = await cookies();
      jar.set("tf_remember", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      });
    } catch {
      // non-fatal
    }
  }

  // Sync FOUNDER_USER_IDS allowlist into DB role so RLS matches portal access.
  if (founderUserIdAllowlist().has(data.user.id) && adminConfigured()) {
    try {
      const admin = createAdminSupabaseClient();
      await admin
        .from("profiles")
        .update({ role: "founder", account_status: "active" })
        .eq("id", data.user.id);
    } catch (err) {
      console.warn("founder allowlist sync", err);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, onboarding_complete, role, email_verified")
    .eq("id", data.user.id)
    .maybeSingle();

  const baseRole: UserRole =
    typeof profile?.role === "string" && isValidRole(profile.role)
      ? profile.role
      : "user";
  const role = resolveEffectiveRole(data.user.id, baseRole);
  const founderPortal = canAccessFounderPortal(role);

  logAuthEvent("auth_login_success", { role });

  if (profile?.must_change_password) {
    return {
      ok: true,
      redirectTo: `/change-password?next=${encodeURIComponent(
        founderPortal && portal === "founder" ? "/founder" : next
      )}`,
    };
  }

  if (profile && !profile.email_verified) {
    return {
      ok: true,
      redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
    };
  }

  // Founder Portal login: skip gym onboarding and require portal role.
  if (portal === "founder" || next.startsWith("/founder")) {
    if (!founderPortal) {
      return {
        ok: false,
        message:
          "This account does not have Founder Portal access. Sign in from the member login, or ask an admin to grant the founder role.",
      };
    }
    return {
      ok: true,
      redirectTo: next.startsWith("/founder") ? next : "/founder",
    };
  }

  if (profile && !profile.onboarding_complete) {
    return { ok: true, redirectTo: "/onboarding" };
  }

  return { ok: true, redirectTo: next };
}

export async function logoutAction(): Promise<void> {
  if (getSupabaseConfigStatus().configured) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
      logAuthEvent("auth_logout");
    } catch {
      // still redirect home
    }
  }
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("forgot");
  if (limited) return limited;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const emailErr = validateEmail(email);
  if (emailErr) {
    return { ok: false, errors: { email: emailErr } };
  }

  const supabase = await createServerSupabaseClient();

  // Always return the same message to avoid account enumeration.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl("/reset-password"),
  });

  logAuthEvent("auth_password_reset_request");
  return { ok: true, message: AUTH_COPY.resetSent };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("reset");
  if (limited) return limited;

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const policyErr = assertPasswordPolicy(password);
  if (policyErr) {
    return { ok: false, errors: { password: policyErr } };
  }
  if (password !== confirm) {
    return {
      ok: false,
      errors: { confirmPassword: "Passwords do not match." },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      ok: false,
      message: mapAuthError(error, "Could not update your password. Try the reset link again."),
    };
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

  logAuthEvent("auth_password_reset_complete");
  return { ok: true, message: AUTH_COPY.resetSuccess };
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("change-password");
  if (limited) return limited;

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const nextRaw = String(formData.get("next") ?? "/app");
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  const policyErr = assertPasswordPolicy(password);
  if (policyErr) {
    return { ok: false, errors: { password: policyErr } };
  }
  if (password !== confirm) {
    return {
      ok: false,
      errors: { confirmPassword: "Passwords do not match." },
    };
  }

  // Reject the known temporary founder password as the new password.
  if (password === founderDevPassword() && founderDevPassword()) {
    return {
      ok: false,
      errors: { password: "Choose a new password that is not the temporary one." },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, message: "Please sign in again." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      ok: false,
      message: mapAuthError(error, "Could not update your password."),
    };
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userData.user.id);

  redirect(next);
}

export async function completeOnboardingAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();

  const timeZone = String(formData.get("timeZone") ?? "UTC").slice(0, 64);
  const preferredLanguage = String(
    formData.get("preferredLanguage") ?? "en"
  ).slice(0, 16);

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, message: "Please sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      time_zone: timeZone || "UTC",
      preferred_language: preferredLanguage || "en",
      onboarding_complete: true,
      account_status: "active",
    })
    .eq("id", userData.user.id);

  if (error) {
    return {
      ok: false,
      message: "Could not save your preferences. Please try again.",
    };
  }

  redirect("/app");
}

export async function resendVerificationAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("resend");
  if (limited) return limited;

  const emailFromForm = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const emailErr = emailFromForm ? validateEmail(emailFromForm) : "Enter your email.";
  if (emailErr) {
    return { ok: false, errors: { email: emailErr } };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: emailFromForm,
    options: { emailRedirectTo: authCallbackUrl("/onboarding") },
  });

  if (error) {
    return {
      ok: false,
      message: mapAuthError(error, "Could not resend the email. Please try again later."),
    };
  }

  return {
    ok: true,
    message: "Verification email sent. Check your inbox.",
  };
}

/** Confirm signup with the 6-digit code from the email. */
export async function verifyEmailOtpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("verify-otp");
  if (limited) return limited;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "")
    .trim()
    .replace(/\s+/g, "");

  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, errors: { email: emailErr } };
  if (!/^\d{6}$/.test(token)) {
    return {
      ok: false,
      errors: { token: "Enter the 6-digit code from your email." },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    logAuthEvent("auth_verification_failure", { reason: error.message });
    return {
      ok: false,
      message: mapAuthError(
        error,
        "That code didn’t work. Request a new email and try again."
      ),
    };
  }

  logAuthEvent("auth_verification_success", { method: "otp" });
  return { ok: true, redirectTo: "/onboarding" };
}

/**
 * Mobile recovery: user long-presses the Confirm link in email, copies it,
 * and pastes here. We extract the token even if redirect_to was localhost.
 */
export async function verifyEmailLinkAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!getSupabaseConfigStatus().configured) return authUnavailable();
  const limited = await rateLimitOrError("verify-link");
  if (limited) return limited;

  const raw = String(formData.get("confirmationLink") ?? "").trim();
  if (!raw) {
    return {
      ok: false,
      errors: { confirmationLink: "Paste the confirmation link from your email." },
    };
  }

  let tokenHash = "";
  let type = "email";
  try {
    const url = new URL(raw);
    tokenHash =
      url.searchParams.get("token_hash") ||
      url.searchParams.get("token") ||
      "";
    type = url.searchParams.get("type") || "email";
  } catch {
    // Allow pasting query-only strings
    const params = new URLSearchParams(
      raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : raw
    );
    tokenHash = params.get("token_hash") || params.get("token") || "";
    type = params.get("type") || "email";
  }

  if (!tokenHash) {
    return {
      ok: false,
      message:
        "We couldn’t find a token in that link. Copy the full Confirm URL from your email.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "email" | "signup" | "invite" | "magiclink" | "recovery",
  });

  if (error) {
    logAuthEvent("auth_verification_failure", { reason: error.message });
    return {
      ok: false,
      message: mapAuthError(
        error,
        "That link is invalid or expired. Resend the email and try again."
      ),
    };
  }

  logAuthEvent("auth_verification_success", { method: "link_paste" });
  if (type === "recovery") {
    return { ok: true, redirectTo: "/reset-password" };
  }
  return { ok: true, redirectTo: "/onboarding" };
}
