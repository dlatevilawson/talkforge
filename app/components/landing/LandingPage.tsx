import Link from "next/link";
import CommunityForge from "@/app/components/landing/CommunityForge";
import ForgeMonoliths from "@/app/components/landing/ForgeMonoliths";
import HeroCinematic from "@/app/components/landing/HeroCinematic";
import LandingNav from "@/app/components/landing/LandingNav";
import ProductReveal from "@/app/components/landing/ProductReveal";
import Reveal from "@/app/components/landing/Reveal";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import TransformationStories from "@/app/components/landing/TransformationStories";
import WaitlistForm from "@/app/components/landing/WaitlistForm";

/**
 * TalkForge homepage — BRAND-001 v2.1 Design Review.
 * Curiosity → Recognition → Hope → Confidence → Belonging → Commitment → Action
 * Every screen must earn the scroll.
 */
export default function LandingPage() {
  return (
    <div className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] text-[var(--lp-ink)]">
      <LandingNav />

      <main>
        {/* 1 Curiosity — cinematic entrance */}
        <HeroCinematic />

        {/* 2 Recognition — human stories */}
        <TransformationStories />

        {/* 3 Hope — The Forge as museum */}
        <ForgeMonoliths />

        {/* Bridge — one quiet line */}
        <section className="bg-[var(--lp-bg)] px-5 py-28 text-center sm:px-8 sm:py-36">
          <Reveal>
            <p className="mx-auto max-w-2xl font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-snug tracking-[-0.03em] text-[var(--lp-ink)] sm:text-4xl">
              Advice is common.
              <br />
              Practice is rare.
            </p>
          </Reveal>
        </section>

        {/* 4 Confidence — product after story */}
        <ProductReveal />

        {/* 5 Belonging */}
        <CommunityForge />

        {/* 6 Commitment — mission peak */}
        <section
          id="mission"
          className="scroll-mt-20 bg-[var(--lp-bg)] px-5 py-40 sm:px-8 sm:py-52"
        >
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <blockquote className="font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-[1.25] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-5xl md:text-6xl md:leading-[1.15]">
                Nobody should ever feel voiceless because they don&apos;t know
                how to express themselves.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* Quiet access — commitment without pressure */}
        <section
          id="access"
          className="scroll-mt-20 border-t border-[var(--lp-line)] px-5 py-28 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-lg text-center">
            <Reveal>
              <h2 className="font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Founding access
              </h2>
              <p className="mx-auto mt-6 text-lg leading-8 text-[var(--lp-muted)]">
                For those ready to begin. No countdown. No pressure.
              </p>
              <a
                href="#begin"
                className="mt-10 inline-flex text-sm font-semibold tracking-wide text-[var(--lp-ink)] underline-offset-4 hover:underline"
              >
                Continue →
              </a>
            </Reveal>
          </div>
        </section>

        {/* 7 Action — finale */}
        <section
          id="begin"
          className="lp-finale scroll-mt-20 bg-[var(--lp-finale)] px-5 py-36 text-white sm:px-8 sm:py-44"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Reveal>
              <TalkForgeLogo variant="finale" className="text-white" />
            </Reveal>
            <Reveal delayMs={160}>
              <h2 className="mt-16 font-[family-name:var(--font-lp-display)] text-3xl font-semibold leading-[1.2] tracking-[-0.035em] sm:text-5xl">
                Every relationship begins with a conversation.
                <br />
                Every opportunity begins with a conversation.
                <br />
                Every future begins with a conversation.
              </h2>
            </Reveal>
            <Reveal delayMs={280}>
              <div className="mt-14 flex w-full justify-center">
                <WaitlistForm ctaLabel="Begin the Forge" tone="dark" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[var(--lp-finale)] px-5 py-12 text-white/45 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <TalkForgeLogo variant="mark" className="text-white" />
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/80">
              Terms
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/30">
          © {new Date().getFullYear()} TalkForge. Every great communicator is
          forged.
        </p>
      </footer>
    </div>
  );
}
