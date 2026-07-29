"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  resendVerificationAction,
  verifyEmailLinkAction,
  verifyEmailOtpAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";

function OtpSubmit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Verify code"
      pendingLabel="Verifying…"
    />
  );
}

function LinkSubmit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Verify pasted link"
      pendingLabel="Verifying…"
    />
  );
}

function ResendSubmit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Resend verification email"
      pendingLabel="Sending…"
    />
  );
}

export default function VerifyEmailPanel({
  email: initialEmail,
}: {
  email?: string | null;
}) {
  const [email, setEmail] = useState(initialEmail || "");
  const [otpState, otpAction] = useActionState(
    verifyEmailOtpAction,
    {} as AuthActionState
  );
  const [linkState, linkAction] = useActionState(
    verifyEmailLinkAction,
    {} as AuthActionState
  );
  const [resendState, resendAction] = useActionState(
    resendVerificationAction,
    {} as AuthActionState
  );

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your email"
      description="Use the 6-digit code from your TalkForge email. If the email button opens localhost on your phone, paste the confirmation link below instead."
      footer={
        <Link href="/login" className="text-zinc-200 underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-8">
        <form action={otpAction} className="space-y-4">
          <label htmlFor="email" className="block text-sm text-zinc-300">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
            />
            {otpState.errors?.email ? (
              <span className="mt-2 block text-sm text-red-300" role="alert">
                {otpState.errors.email}
              </span>
            ) : null}
          </label>
          <label htmlFor="token" className="block text-sm text-zinc-300">
            6-digit code
            <input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="123456"
              className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 tracking-[0.35em] text-white outline-none focus:border-white/40"
            />
            {otpState.errors?.token ? (
              <span className="mt-2 block text-sm text-red-300" role="alert">
                {otpState.errors.token}
              </span>
            ) : null}
          </label>
          <AuthAlert message={otpState.message} />
          <OtpSubmit />
        </form>

        <div className="border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Phone workaround
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Long-press “Confirm email address” in Gmail → Copy → paste below.
            Works even when the link points at localhost.
          </p>
          <form action={linkAction} className="mt-4 space-y-4">
            <label
              htmlFor="confirmationLink"
              className="block text-sm text-zinc-300"
            >
              Paste confirmation link
              <textarea
                id="confirmationLink"
                name="confirmationLink"
                rows={3}
                placeholder="https://….supabase.co/auth/v1/verify?token=…"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/40"
              />
            </label>
            <AuthAlert
              message={
                linkState.message || linkState.errors?.confirmationLink
              }
            />
            <LinkSubmit />
          </form>
        </div>

        <div className="border-t border-white/10 pt-6">
          <form action={resendAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <AuthAlert
              message={resendState.message}
              tone={resendState.ok ? "success" : "error"}
            />
            {resendState.errors?.email ? (
              <p className="text-sm text-red-300" role="alert">
                {resendState.errors.email}
              </p>
            ) : null}
            <ResendSubmit />
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
