"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  resetPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import { PasswordField } from "@/app/components/auth/PasswordField";
import { trackAuthEvent } from "@/lib/auth/analytics";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Update password"
      pendingLabel="Updating…"
    />
  );
}

export default function ResetPasswordForm() {
  const [state, action] = useActionState(
    resetPasswordAction,
    {} as AuthActionState
  );

  useEffect(() => {
    if (state.ok) trackAuthEvent("auth_password_reset_complete");
  }, [state.ok]);

  if (state.ok) {
    return (
      <AuthShell
        eyebrow="Password updated"
        title="You’re all set"
        description={state.message}
        footer={
          <Link href="/login" className="text-zinc-200 underline">
            Return to sign in
          </Link>
        }
      >
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
        >
          Sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Choose a new password"
      description="Use a strong password you haven’t used elsewhere."
    >
      <form action={action} className="space-y-4">
        <PasswordField
          id="password"
          name="password"
          label="New password"
          showStrength
          error={state.errors?.password}
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          error={state.errors?.confirmPassword}
        />
        <AuthAlert message={state.message} />
        <Submit />
      </form>
    </AuthShell>
  );
}
