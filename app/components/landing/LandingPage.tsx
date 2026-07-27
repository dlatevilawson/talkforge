import Image from "next/image";
import Link from "next/link";
import CommunityForge from "@/app/components/landing/CommunityForge";
import ForgePhilosophy from "@/app/components/landing/ForgePhilosophy";
import LandingNav from "@/app/components/landing/LandingNav";
import ProductReveal from "@/app/components/landing/ProductReveal";
import Reveal from "@/app/components/landing/Reveal";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import WaitlistForm from "@/app/components/landing/WaitlistForm";

/**
 * TalkForge homepage — Brand Directive v2.
 * Emotion → Belief → Identity → Product.
 * Chapters unfold like entering The Forge.
 */
export default function LandingPage() {
  return (
    <div className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] text-[var(--lp-ink)]">
      <LandingNav />

      <main>
        {/* HERO — cinematic identity */}
        <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28 sm:px-8">
          <div className="lp-hero-atmosphere pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
            <Reveal>
              <TalkForgeLogo variant="hero" />
            </Reveal>

            <Reveal delayMs={200}>
              <h1 className="mt-14 font-[family-name:var(--font-lp-display)] text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--lp-ink)] sm:mt-16 sm:text-6xl md:text-[5.25rem]">
                Communication changes lives.
                <br />
                Master yours.
              </h1>
            </Reveal>

            <Reveal delayMs={360}>
              <p className="mx-auto mt-8 max-w-lg text-lg leading-8 text-[var(--lp-muted)] sm:text-xl sm:leading-9">
                Nobody is born a great communicator.
                <br className="hidden sm:block" />
                Every great communicator is forged.
              </p>
            </Reveal>

            <Reveal delayMs={480}>
              <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row">
                <a
                  href="#begin"
                  className="inline-flex min-h-12 min-w-[14rem] items-center justify-center rounded-full bg-[var(--lp-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--lp-bg)] transition hover:bg-[var(--lp-ink-soft)]"
                >
                  Forge Your Voice
                </a>
                <Link
                  href="/welcome"
                  className="inline-flex min-h-12 min-w-[14rem] items-center justify-center rounded-full border border-[var(--lp-line)] bg-transparent px-8 text-sm font-semibold tracking-wide text-[var(--lp-ink)] transition hover:bg-white/60"
                >
                  Watch Someone Transform
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CHAPTER ONE — The Problem */}
        <section
          id="problem"
          className="relative min-h-[90vh] scroll-mt-20 overflow-hidden"
        >
          <Image
            src="/landing/chapter-problem.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/25" />
          <div className="relative z-10 flex min-h-[90vh] items-end px-5 pb-20 sm:px-10 sm:pb-28">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">
                Chapter One
              </p>
              <h2 className="mt-5 max-w-3xl font-[family-name:var(--font-lp-display)] text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl">
                Millions stay silent because nobody taught them how to practice.
              </h2>
            </Reveal>
          </div>
        </section>

        {/* CHAPTER TWO — The Forge */}
        <section
          id="forge"
          className="scroll-mt-20 px-5 py-28 sm:px-8 sm:py-36"
        >
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Chapter Two — The Forge
              </p>
              <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Where transformation begins.
              </h2>
              <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-[var(--lp-muted)]">
                Not more advice. A place to rehearse the conversations that shape
                your relationships, opportunities, and future.
              </p>
            </Reveal>
            <ForgePhilosophy />
          </div>
        </section>

        {/* CHAPTER THREE — Transformation (product as proof) */}
        <section
          id="transformation"
          className="scroll-mt-20 border-t border-[var(--lp-line)] px-5 py-28 sm:px-8 sm:py-36"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Chapter Three
              </p>
              <h2 className="mx-auto mt-6 max-w-3xl text-center font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Practice difficult conversations before they matter.
              </h2>
            </Reveal>
            <ProductReveal />
          </div>
        </section>

        {/* CHAPTER FOUR — Community / humanity */}
        <section
          id="community"
          className="scroll-mt-20 border-t border-[var(--lp-line)]"
        >
          <div className="relative min-h-[50vh] overflow-hidden">
            <Image
              src="/landing/chapter-humanity.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 flex min-h-[50vh] items-center justify-center px-5 py-24 text-center">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">
                  Chapter Four
                </p>
                <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  You’re joining something bigger.
                </h2>
              </Reveal>
            </div>
          </div>
          <div className="px-5 py-20 sm:px-8 sm:py-28">
            <Reveal>
              <p className="mx-auto max-w-xl text-center text-lg leading-8 text-[var(--lp-muted)]">
                Across careers, friendships, families, and hard talks — people are
                choosing practice over silence.
              </p>
            </Reveal>
            <CommunityForge />
          </div>
        </section>

        {/* CHAPTER FIVE — Mission (peak) */}
        <section
          id="mission"
          className="scroll-mt-20 px-5 py-36 sm:px-8 sm:py-48"
        >
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Chapter Five
              </p>
              <blockquote className="mt-10 font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-[1.25] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-5xl md:text-6xl md:leading-[1.2]">
                Nobody should ever feel voiceless because they don&apos;t know
                how to express themselves.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* CHAPTER SIX — Access (quiet; no pressure pricing) */}
        <section
          id="access"
          className="scroll-mt-20 border-t border-[var(--lp-line)] px-5 py-28 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Chapter Six
              </p>
              <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Founding access.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-[var(--lp-muted)]">
                Quiet entry for the first people who choose to practice. No
                pressure. No countdown. When you’re ready — the Forge is open.
              </p>
            </Reveal>
            <Reveal delayMs={100}>
              <div className="mx-auto mt-14 max-w-md border-t border-[var(--lp-line)] pt-10 text-left">
                <p className="font-[family-name:var(--font-lp-display)] text-2xl font-semibold tracking-[-0.02em]">
                  Founding Member
                </p>
                <p className="mt-3 text-base leading-7 text-[var(--lp-muted)]">
                  Early access when the floor opens. A voice in shaping TalkForge.
                  Permanent recognition as someone who began here.
                </p>
                <p className="mt-6 text-sm text-[var(--lp-muted)]">
                  Pricing stays quiet until you’re already sure you belong.
                </p>
                <a
                  href="#begin"
                  className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold tracking-wide text-[var(--lp-ink)] underline-offset-4 hover:underline"
                >
                  Continue to the Forge →
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FINAL CHAPTER — Begin */}
        <section
          id="begin"
          className="lp-finale scroll-mt-20 bg-[var(--lp-finale)] px-5 py-32 text-white sm:px-8 sm:py-40"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Reveal>
              <TalkForgeLogo variant="finale" className="text-white" />
            </Reveal>
            <Reveal delayMs={160}>
              <h2 className="mt-14 font-[family-name:var(--font-lp-display)] text-3xl font-semibold leading-[1.2] tracking-[-0.035em] sm:text-5xl md:text-6xl">
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

      <footer className="border-t border-white/10 bg-[var(--lp-finale)] px-5 py-12 text-white/50 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <TalkForgeLogo className="text-white" />
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/80">
              Terms
            </Link>
            <Link href="/welcome" className="hover:text-white/80">
              Watch Someone Transform
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/35">
          © {new Date().getFullYear()} TalkForge. Every great communicator is
          forged.
        </p>
      </footer>
    </div>
  );
}
