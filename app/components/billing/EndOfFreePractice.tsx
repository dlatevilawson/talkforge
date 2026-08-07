"use client";

import Link from "next/link";
import BecomeProMemberButton from "@/app/components/billing/BecomeProMemberButton";
import {
  COMPLIMENTARY_COMPLETE_BODY,
  COMPLIMENTARY_COMPLETE_HEADLINE,
  MAYBE_LATER_CTA,
} from "@/lib/billing/member-copy";

type Props = {
  /** Optional supporting copy; defaults to mission-aligned body. */
  message?: string | null;
};

export default function EndOfFreePractice({ message }: Props) {
  const body = message?.trim()
    ? [message.trim()]
    : [...COMPLIMENTARY_COMPLETE_BODY];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#07070a] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,169,95,0.14),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a95f]">
          Coach Forge
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {COMPLIMENTARY_COMPLETE_HEADLINE}
        </h1>
        <div className="mt-5 max-w-md space-y-3 text-base leading-7 text-white/55">
          {body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <BecomeProMemberButton source="end_of_free" />
          <Link
            href="/app"
            className="rounded-full border border-white/10 px-8 py-3.5 text-sm text-white/55 transition hover:bg-white/10"
          >
            {MAYBE_LATER_CTA}
          </Link>
        </div>

        <p className="mt-10 text-sm text-white/35">
          Your account stays open. Explore Progress, Living Profile, and Home
          anytime.
        </p>
      </div>
    </main>
  );
}
