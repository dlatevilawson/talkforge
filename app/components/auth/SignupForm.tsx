"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type AuthActionState } from "@/app/actions/auth";
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
    <AuthSubmit
      pending={pending}
      label="Create account"
      pendingLabel="Creating…"
    />
  );
}

export default function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signupAction, {} as AuthActionState);

  useEffect(() => {
    if (state.ok) trackAuthEvent("auth_signup_success");
    else if (state.message && !state.ok)
      trackAuthEvent("auth_signup_failure");
  }, [state.ok, state.message]);

  if (state.ok) {
    const verifyHref = state.email
      ? `/verify-email?email=${encodeURIComponent(state.email)}`
      : "/verify-email";
    return (
      <AuthShell
        eyebrow="Check your inbox"
        title="Verify your email"
        description={state.message}
        footer={
          <Link href="/login" className="text-zinc-200 underline">
            Back to sign in
          </Link>
        }
      >
        <Link
          href={verifyHref}
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
        >
          Enter verification code
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Email and password are enough to begin. You can personalize your profile after verification."
      footer={
        <>
          Already training?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-zinc-200 underline"
          >
            Sign in
          </Link>
        </>
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
        <AuthInput
          id="displayName"
          name="displayName"
          label="Display name (optional)"
          autoComplete="nickname"
          error={state.errors?.displayName}
        />
        <PasswordField showStrength error={state.errors?.password} />
        <AuthAlert message={state.message} />
        <Submit />
      </form>
    </AuthShell>
  );
}
