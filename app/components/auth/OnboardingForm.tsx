"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeOnboardingAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  AuthAlert,
  AuthShell,
  AuthSubmit,
} from "@/app/components/auth/AuthShell";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <AuthSubmit
      pending={pending}
      label="Enter the Gym"
      pendingLabel="Saving…"
    />
  );
}

export default function OnboardingForm({
  displayName,
}: {
  displayName: string;
}) {
  const [state, action] = useActionState(
    completeOnboardingAction,
    {} as AuthActionState
  );

  return (
    <AuthShell
      eyebrow="Onboarding"
      title={`Welcome${displayName ? `, ${displayName.split(" ")[0]}` : ""}`}
      description="A few preferences so TalkForge can personalize your practice."
    >
      <form action={action} className="space-y-4">
        <label className="block text-sm text-zinc-300">
          Time zone
          <input
            name="timeZone"
            defaultValue={
              typeof Intl !== "undefined"
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : "UTC"
            }
            className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Preferred language
          <select
            name="preferredLanguage"
            defaultValue="en"
            className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </label>
        <AuthAlert message={state.message} />
        <Submit />
      </form>
    </AuthShell>
  );
}
