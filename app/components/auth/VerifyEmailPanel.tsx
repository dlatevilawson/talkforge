"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
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
import { trackAuthEvent } from "@/lib/auth/analytics";

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
  next = "/onboarding",
}: {
  email?: string | null;
  next?: string;
}) {
  const router = useRouter();
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

  useEffect(() => {
    const dest = otpState.redirectTo || linkState.redirectTo;
    if ((otpState.ok || linkState.ok) && dest) {
      trackAuthEvent("auth_verification_success");
      router.push(dest);
      router.refresh();
    }
  }, [
    otpState.ok,
    otpState.redirectTo,
    linkState.ok,
    linkState.redirectTo,
    router,
  ]);

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your email"
      description="Open your TalkForge email and tap Verify, or enter the 6-digit code below. After verification you’ll continue to onboarding."
      footer={
        <Link href="/login" className="text-zinc-200 underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-8">
        <form action={otpAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
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
          <AuthAlert
            message={
              otpState.ok
                ? "Email verified. Continuing…"
                : otpState.message
            }
            tone={otpState.ok ? "success" : "error"}
          />
          <OtpSubmit />
        </form>

        <div className="border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Backup
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            If a confirmation link misbehaves on mobile, long-press → Copy →
            paste here.
          </p>
          <form action={linkAction} className="mt-4 space-y-4">
            <input type="hidden" name="next" value={next} />
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
                linkState.ok
                  ? "Email verified. Continuing…"
                  : linkState.message || linkState.errors?.confirmationLink
              }
              tone={linkState.ok ? "success" : "error"}
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
