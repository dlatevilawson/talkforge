"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type AuthActionState } from "@/app/actions/auth";
import {
  AuthAlert,
  AuthInput,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import { PasswordField } from "@/app/components/auth/PasswordField";

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

  if (state.ok) {
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
          href="/verify-email"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
        >
          Continue
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Train for the conversations that matter. We’ll verify your email before you enter the Gym."
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthInput
            id="firstName"
            name="firstName"
            label="First name"
            autoComplete="given-name"
            required
            error={state.errors?.firstName}
          />
          <AuthInput
            id="lastName"
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            required
            error={state.errors?.lastName}
          />
        </div>
        <AuthInput
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={state.errors?.email}
        />
        <PasswordField showStrength error={state.errors?.password} />
        <AuthAlert message={state.message} />
        <Submit />
      </form>
    </AuthShell>
  );
}
