"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  resendVerificationAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import Link from "next/link";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Resend verification email"
      pendingLabel="Sending…"
    />
  );
}

export default function VerifyEmailPanel({ email }: { email?: string | null }) {
  const [state, action] = useActionState(
    resendVerificationAction,
    {} as AuthActionState
  );

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your email"
      description={
        email
          ? `We sent a verification link to ${email}. Open it to activate your TalkForge account.`
          : "Check your inbox for a verification link from TalkForge. After you confirm, we’ll create your profile and open onboarding."
      }
      footer={
        <Link href="/login" className="text-zinc-200 underline">
          Back to sign in
        </Link>
      }
    >
      <form action={action} className="space-y-4">
        <AuthAlert
          message={state.message}
          tone={state.ok ? "success" : "error"}
        />
        <Submit />
      </form>
    </AuthShell>
  );
}
