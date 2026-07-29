"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  forgotPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthInput,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import { trackAuthEvent } from "@/lib/auth/analytics";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Send reset link"
      pendingLabel="Sending…"
    />
  );
}

export default function ForgotPasswordForm() {
  const [state, action] = useActionState(
    forgotPasswordAction,
    {} as AuthActionState
  );

  useEffect(() => {
    if (state.ok) trackAuthEvent("auth_password_reset_request");
  }, [state.ok]);

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Forgot your password?"
      description="Enter the email on your account. If it matches, we’ll send a secure reset link."
      footer={
        <Link href="/login" className="text-zinc-200 underline">
          Back to sign in
        </Link>
      }
    >
      <form action={action} className="space-y-4">
        <AuthInput
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={state.errors?.email}
        />
        <AuthAlert
          message={state.message}
          tone={state.ok ? "success" : "error"}
        />
        <Submit />
      </form>
    </AuthShell>
  );
}
