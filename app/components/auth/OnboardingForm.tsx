"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  completeOnboardingAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { AuthAlert } from "@/app/components/auth/AuthShell";
import TrainingFocusPicker from "@/app/components/TrainingFocusPicker";
import pickerStyles from "@/app/components/TrainingFocusPicker.module.css";
import type { TrainingFocusOption } from "@/lib/system2/training-focus";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={pickerStyles.primary}
    >
      {pending ? pendingLabel : label}
    </button>
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
  const [selected, setSelected] = useState<TrainingFocusOption | null>(null);
  const firstName = displayName.split(" ")[0] || "";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--tf-bg)] text-[var(--tf-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,155,74,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.06),_transparent_50%)]"
      />
      <main className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--tf-gold)]"
        >
          TalkForge
        </Link>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          Welcome{firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Walk into today already ready.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Pick the conversation that matters — or skip and begin with Forge. You
          can refine later.
        </p>

        <form action={action} className="mt-10 space-y-8">
          <TrainingFocusPicker
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            eyebrow="Optional"
            title="What conversation are you preparing for?"
            subtitle="One tap. No questionnaire. Skip anytime."
          />

          <input
            type="hidden"
            name="purposeStatement"
            value={selected?.purposeStatement ?? ""}
          />
          <input
            type="hidden"
            name="seasonLabel"
            value={selected?.seasonLabel ?? ""}
          />
          <input
            type="hidden"
            name="preferredNickname"
            value={firstName}
          />
          <input
            type="hidden"
            name="timeZone"
            value={
              typeof Intl !== "undefined"
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : "UTC"
            }
          />
          <input type="hidden" name="preferredLanguage" value="en" />

          <AuthAlert message={state.message} />

          <div className={pickerStyles.actions}>
            <Submit
              label={
                selected
                  ? "Begin with this conversation"
                  : "Skip — begin with Forge"
              }
              pendingLabel="Opening Forge…"
            />
            {selected ? (
              <button
                type="button"
                className={pickerStyles.secondary}
                onClick={() => setSelected(null)}
              >
                Clear selection
              </button>
            ) : null}
          </div>
          <p className={pickerStyles.hint}>
            Focus is optional. Your Coach is ready either way.
          </p>
        </form>
      </main>
    </div>
  );
}
