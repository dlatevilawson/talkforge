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
  const [planKind, setPlanKind] = useState<"6_week" | "6_month">("6_week");
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
          <input type="hidden" name="planKind" value={planKind} />

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7" aria-labelledby="plan-heading">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--tf-gold)]">Your journey</p>
            <h2 id="plan-heading" className="mt-3 text-2xl font-semibold text-white">Choose once. Practice daily.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">Pick the pace that fits you. Forge will give you one thing to practice each day.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["6_week", "6-week sprint", "A full journey: one focus at a time, replanned every two weeks around how you’re doing."],
                ["6_month", "6-month build", "Compounding practice: blocks that adapt as you grow, one day at a time."],
              ] as const).map(([value, title, body]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlanKind(value)}
                  className={`rounded-2xl border p-5 text-left transition ${planKind === value ? "border-[var(--tf-gold)] bg-[var(--tf-gold)]/[0.10]" : "border-white/10 bg-black/10 hover:border-white/25"}`}
                  aria-pressed={planKind === value}
                >
                  <span className="block text-base font-semibold text-white">{title}</span>
                  <span className="mt-2 block text-sm leading-6 text-zinc-400">{body}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-sm text-zinc-300">
                Got something coming up? <span className="text-zinc-500">(optional)</span>
                <input name="occasionText" maxLength={240} placeholder="e.g. board interview, wedding toast" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[var(--tf-gold)]" />
              </label>
              <label className="text-sm text-zinc-300">
                Date <span className="text-zinc-500">(optional)</span>
                <input name="occasionDate" type="date" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-[var(--tf-gold)]" />
              </label>
            </div>
          </section>

          <AuthAlert message={state.message} />

          <div className={pickerStyles.actions}>
            <Submit
              label={
                "Start my plan"
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
