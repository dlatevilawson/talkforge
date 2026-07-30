"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "@/app/actions/auth";
import {
  AuthAlert,
  AuthInput,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import { PasswordField } from "@/app/components/auth/PasswordField";
import { migrateGuestPracticeData } from "@/lib/auth/migrate-guest";
import { trackAuthEvent } from "@/lib/auth/analytics";
import {
  bindAuthenticatedUserId,
  getCurrentUserId,
  isGuestUserId,
  stashPendingGuestUserId,
} from "@/lib/identity";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label={label}
      pendingLabel="Signing in…"
    />
  );
}

export default function LoginForm({
  next,
  notice,
  variant = "member",
}: {
  next: string;
  notice?: string;
  /** Founder Portal entry uses the same auth action with portal-bound next. */
  variant?: "member" | "founder";
}) {
  const router = useRouter();
  const [state, action] = useActionState(loginAction, {} as AuthActionState);
  const isFounder = variant === "founder";

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      trackAuthEvent("auth_login_success");
      void (async () => {
        try {
          const prior = getCurrentUserId();
          if (prior && isGuestUserId(prior)) {
            stashPendingGuestUserId(prior);
          }
          const supabase = createBrowserSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) {
            bindAuthenticatedUserId(user.id);
            await migrateGuestPracticeData(user.id);
          }
        } catch {
          // Non-fatal — AppShell will bind identity on /app.
        }
        router.push(state.redirectTo!);
        router.refresh();
      })();
      return;
    }
    if (state.message && !state.ok) {
      trackAuthEvent("auth_login_failure");
    }
  }, [state.ok, state.redirectTo, state.message, router]);

  return (
    <AuthShell
      eyebrow={isFounder ? "Founder Portal" : "Welcome back"}
      title={isFounder ? "Founder sign in" : "Sign in"}
      description={
        isFounder
          ? "Sign in with your Founder account to open Headquarters. Same TalkForge identity — portal access is role-gated."
          : "Use your TalkForge email and password. Founder Portal access is granted by role on the same account."
      }
      footer={
        isFounder ? (
          <>
            Member gym?{" "}
            <Link href="/login" className="text-zinc-200 underline">
              Sign in here
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-zinc-200 underline"
            >
              Create an account
            </Link>
            <span className="mt-2 block">
              Founder?{" "}
              <Link
                href="/login/founder"
                className="text-zinc-200 underline"
              >
                Founder Portal sign in
              </Link>
            </span>
          </>
        )
      }
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input
          type="hidden"
          name="portal"
          value={isFounder ? "founder" : "app"}
        />
        {notice ? <AuthAlert message={notice} tone="success" /> : null}
        <AuthInput
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
        />
        <PasswordField autoComplete="current-password" showStrength={false} />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              name="remember"
              className="rounded border-white/20 bg-white/5"
              defaultChecked
            />
            Keep me signed in
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Forgot password?
          </Link>
        </div>
        <AuthAlert message={state.message} />
        <Submit label={isFounder ? "Enter Founder Portal" : "Sign in"} />
      </form>
    </AuthShell>
  );
}
