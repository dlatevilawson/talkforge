import Link from "next/link";
import FaqAccordion from "@/app/components/landing/FaqAccordion";
import LandingNav from "@/app/components/landing/LandingNav";
import Reveal from "@/app/components/landing/Reveal";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import WaitlistForm from "@/app/components/landing/WaitlistForm";

const steps = [
  {
    title: "Practice",
    body: "Rehearse the conversation that matters with Forge — privately, before the stakes are real.",
  },
  {
    title: "Improve",
    body: "Get coaching grounded in what you actually said — not generic tips.",
  },
  {
    title: "Transfer",
    body: "Walk into interviews, hard talks, and leadership moments more ready — and build better relationships over time.",
  },
] as const;

const foundingBenefits = [
  "Early access when the floor opens",
  "A real voice in shaping what TalkForge becomes",
  "Founding updates — no spam, no fake scarcity",
  "Permanent recognition as a Founding Member",
] as const;

export default function LandingPage() {
  return (
    <div className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] text-[var(--lp-ink)]">
      <LandingNav />

      <main>
        {/* Hero — one composition: brand, what it is, one CTA group, dominant visual */}
        <section className="relative min-h-[100dvh] overflow-hidden">
          <div className="lp-hero-atmosphere pointer-events-none absolute inset-0" aria-hidden />
          <div
            className="lp-hero-mark pointer-events-none absolute -right-[20%] top-[10%] h-[70vh] w-[70vh] opacity-[0.04] sm:right-[-5%]"
            aria-hidden
          />

          <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col justify-center px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
            <div className="text-center">
              <Reveal>
                <div className="mx-auto mb-8 flex justify-center text-[var(--lp-ink)] sm:mb-10">
                  <TalkForgeLogo variant="hero" />
                </div>
              </Reveal>

              <Reveal delayMs={70}>
                <p className="text-sm font-medium tracking-[0.04em] text-[var(--lp-steel)] sm:text-base">
                  AI Communication Gym
                </p>
              </Reveal>

              <Reveal delayMs={120}>
                <h1 className="mx-auto mt-4 max-w-3xl font-[family-name:var(--font-lp-display)] text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--lp-ink)] sm:mt-5 sm:text-6xl md:text-[4.25rem]">
                  Practice the conversations that matter.
                </h1>
              </Reveal>

              <Reveal delayMs={180}>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--lp-muted)] sm:mt-8 sm:text-xl sm:leading-9">
                  Rehearse with Forge — an AI coach — then walk into the real
                  moment ready.
                </p>
              </Reveal>

              <Reveal delayMs={240}>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row">
                  <a
                    href="#waitlist"
                    className="inline-flex min-h-12 min-w-[15rem] items-center justify-center rounded-full bg-[var(--lp-ink)] px-8 text-sm font-semibold text-[var(--lp-bg)] transition hover:bg-[var(--lp-ink-soft)]"
                  >
                    Join the Founding Waitlist
                  </a>
                  <Link
                    href="/welcome"
                    className="inline-flex min-h-12 min-w-[15rem] items-center justify-center rounded-full border border-[var(--lp-line)] bg-[color-mix(in_oklab,white_55%,transparent)] px-8 text-sm font-semibold text-[var(--lp-ink)] backdrop-blur-sm transition hover:bg-white"
                  >
                    See TalkForge in Action
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Dominant practice-floor visual plane — not a card collage */}
            <Reveal delayMs={320}>
              <div className="lp-practice-floor relative mx-auto mt-16 w-full max-w-4xl sm:mt-20">
                <div className="lp-practice-floor-inner px-6 py-8 sm:px-10 sm:py-10">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--lp-steel)]">
                    On the floor
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-lp-display)] text-2xl font-medium tracking-[-0.03em] text-[var(--lp-ink)] sm:text-3xl">
                    “I have a hard conversation tomorrow.”
                  </p>
                  <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--lp-muted)]">
                        You
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--lp-ink-soft)] sm:text-base">
                        Speak the words you’d say in real life.
                      </p>
                    </div>
                    <div
                      className="hidden h-px w-16 bg-[var(--lp-line)] sm:block"
                      aria-hidden
                    />
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--lp-muted)]">
                        Forge
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--lp-ink-soft)] sm:text-base">
                        Listens, responds, and helps you improve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                How it works
              </p>
              <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Advice is common. Practice is rare.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--lp-muted)]">
                TalkForge exists so you can get reps before the conversation that
                counts — not another article to forget.
              </p>
            </Reveal>

            <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <Reveal delayMs={index * 80}>
                    <p className="font-[family-name:var(--font-lp-display)] text-5xl font-medium tracking-[-0.04em] text-[var(--lp-steel)] opacity-40">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 font-[family-name:var(--font-lp-display)] text-2xl font-semibold tracking-[-0.02em]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-[var(--lp-muted)]">
                      {step.body}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Belief */}
        <section
          id="belief"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Our Belief
              </p>
              <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-[var(--lp-muted)] sm:text-xl sm:leading-9">
                You weren&apos;t born a poor communicator.
                <br className="hidden sm:block" />
                Nobody ever taught you how to practice.
              </p>
              <blockquote className="mt-10 font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-snug tracking-[-0.03em] text-[var(--lp-ink)] sm:text-4xl sm:leading-[1.25]">
                Nobody should ever feel voiceless because they don&apos;t know
                how to express themselves.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* Founding Members */}
        <section
          id="founding"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Founding Members
              </p>
              <h2 className="mt-5 font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Help build the world&apos;s communication gym.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
                Founding Members aren&apos;t spectators. You&apos;re the first
                people we practice with — and the people who shape what TalkForge
                becomes.
              </p>
            </Reveal>

            <Reveal delayMs={80}>
              <ul className="mt-12 space-y-4 border-t border-[var(--lp-line)] pt-10">
                {foundingBenefits.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 text-base leading-7 text-[var(--lp-ink-soft)]"
                  >
                    <span
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lp-steel)]"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Waitlist */}
        <section
          id="waitlist"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-xl">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Waitlist
              </p>
              <h2 className="mt-5 text-center font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Reserve your place on the floor.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-center text-base leading-7 text-[var(--lp-muted)]">
                Join the founding waitlist. When TalkForge opens, you&apos;ll be
                among the first to practice.
              </p>
            </Reveal>
            <Reveal delayMs={100}>
              <div className="mt-10">
                <WaitlistForm />
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                FAQ
              </p>
              <h2 className="mt-5 font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Straight answers.
              </h2>
            </Reveal>
            <Reveal delayMs={80}>
              <div className="mt-12">
                <FaqAccordion />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--lp-line)] px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <TalkForgeLogo />
            <p className="mt-5 text-sm leading-6 text-[var(--lp-muted)]">
              An AI Communication Gym — so nobody feels voiceless because they
              never got to practice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--lp-muted)]">
                Explore
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-ink)]">
                <li>
                  <a href="#how" className="hover:opacity-70">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#belief" className="hover:opacity-70">
                    Belief
                  </a>
                </li>
                <li>
                  <a href="#waitlist" className="hover:opacity-70">
                    Join Waitlist
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--lp-muted)]">
                Product
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-ink)]">
                <li>
                  <Link href="/welcome" className="hover:opacity-70">
                    See it in action
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--lp-muted)]">
                Legal
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-ink)]">
                <li>
                  <Link href="/privacy" className="hover:opacity-70">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:opacity-70">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-14 max-w-6xl text-xs text-[var(--lp-muted)]">
          © {new Date().getFullYear()} TalkForge. Practice before performance.
        </p>
      </footer>
    </div>
  );
}
