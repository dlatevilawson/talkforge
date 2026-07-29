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
import { trackAuthEvent } from "@/lib/auth/analytics";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in…" />
  );
}

export default function LoginForm({
  next,
  notice,
}: {
  next: string;
  notice?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(loginAction, {} as AuthActionState);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      trackAuthEvent("auth_login_success");
      router.push(state.redirectTo);
      router.refresh();
      return;
    }
    if (state.message && !state.ok) {
      trackAuthEvent("auth_login_failure");
    }
  }, [state.ok, state.redirectTo, state.message, router]);

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Use your TalkForge email and password. Founder Portal access is granted by role — not a separate login."
      footer={
        <>
          New here?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="text-zinc-200 underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
        <Submit />
      </form>
    </AuthShell>
  );
}
