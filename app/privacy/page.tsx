import type { Metadata } from "next";
import Link from "next/link";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

export const metadata: Metadata = {
  title: "Privacy — TalkForge",
  description: "TalkForge privacy policy.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[#F7F8FA] px-5 py-16 text-[#121417] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex text-[#121417]">
          <TalkForgeLogo />
        </Link>
        <h1 className="mt-12 text-4xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-3 text-sm text-[#5A616C]">Last updated: July 22, 2026</p>
        <div className="mt-10 space-y-6 text-base leading-7 text-[#3A404A]">
          <p>
            TalkForge collects the email address you submit when joining the
            Founding Members waitlist so we can notify you about early access and
            product updates.
          </p>
          <p>
            We do not sell your email address. We do not share waitlist emails
            with advertisers. Access to waitlist data is limited to TalkForge
            operators.
          </p>
          <p>
            When you use TalkForge practice experiences, session data may be
            stored to provide coaching and improve your practice over time. You
            can request deletion of your waitlist email or practice data by
            contacting us at{" "}
            <a className="underline" href="mailto:hello@talkforge.io">
              hello@talkforge.io
            </a>
            .
          </p>
          <p>
            This policy will expand as TalkForge launches additional features.
            Material changes will be reflected on this page.
          </p>
        </div>
        <Link href="/" className="mt-12 inline-block text-sm underline-offset-4 hover:underline">
          Back to TalkForge
        </Link>
      </div>
    </main>
  );
}
