"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";
import { PasswordField } from "@/app/components/auth/PasswordField";
import { AUTH_COPY } from "@/lib/auth/messages";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Save new password"
      pendingLabel="Saving…"
    />
  );
}

export default function ChangePasswordForm({ next }: { next: string }) {
  const [state, action] = useActionState(
    changePasswordAction,
    {} as AuthActionState
  );

  return (
    <AuthShell
      eyebrow="Security"
      title="Change your password"
      description={AUTH_COPY.mustChangePassword}
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
