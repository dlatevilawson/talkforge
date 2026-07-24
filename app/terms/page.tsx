import type { Metadata } from "next";
import Link from "next/link";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

export const metadata: Metadata = {
  title: "Terms — TalkForge",
  description: "TalkForge terms of use.",
};

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#F7F8FA] px-5 py-16 text-[#121417] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex text-[#121417]">
          <TalkForgeLogo />
        </Link>
        <h1 className="mt-12 text-4xl font-semibold tracking-tight">Terms</h1>
        <p className="mt-3 text-sm text-[#5A616C]">Last updated: July 22, 2026</p>
        <div className="mt-10 space-y-6 text-base leading-7 text-[#3A404A]">
          <p>
            By joining the TalkForge Founding Members waitlist or using TalkForge
            practice experiences, you agree to use the service lawfully and
            respectfully.
          </p>
          <p>
            TalkForge provides practice and coaching tools. It does not provide
            legal, medical, therapeutic, or professional advice. You remain
            responsible for your real-world conversations and decisions.
          </p>
          <p>
            Founding Member benefits (early access, recognition, updates) will be
            fulfilled in good faith as the product launches. Specific launch
            timing may change as we protect quality.
          </p>
          <p>
            Questions:{" "}
            <a className="underline" href="mailto:hello@talkforge.io">
              hello@talkforge.io
            </a>
            .
          </p>
        </div>
        <Link href="/" className="mt-12 inline-block text-sm underline-offset-4 hover:underline">
          Back to TalkForge
        </Link>
      </div>
    </main>
  );
}
