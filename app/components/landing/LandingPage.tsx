import Link from "next/link";
import FaqAccordion from "@/app/components/landing/FaqAccordion";
import LandingNav from "@/app/components/landing/LandingNav";
import Reveal from "@/app/components/landing/Reveal";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import WaitlistForm from "@/app/components/landing/WaitlistForm";

const journey = [
  { title: "Practice", body: "Rehearse the conversations that matter with Forge." },
  { title: "Confidence", body: "Capability grows through repetition — not pep talks." },
  { title: "Real conversations", body: "Take what you practiced into the moments that count." },
  {
    title: "Better relationships",
    body: "Clearer words. Stronger trust. More opportunities.",
  },
] as const;

const foundingBenefits = [
  {
    title: "Early access",
    body: "Step onto the floor before the wider world arrives.",
  },
  {
    title: "Help shape the product",
    body: "Your practice and feedback guide what TalkForge becomes.",
  },
  {
    title: "Exclusive updates",
    body: "Founding notes on what we’re building — and why.",
  },
  {
    title: "Permanent recognition",
    body: "You’ll always be recognized as a Founding Member.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] text-[var(--lp-ink)]">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-24 pt-32 sm:px-8 sm:pb-32 sm:pt-40">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(26,58,92,0.06),transparent_60%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="mx-auto mb-10 flex justify-center text-[var(--lp-ink)]">
                <TalkForgeLogo className="scale-110" />
              </div>
            </Reveal>
            <Reveal delayMs={80}>
              <h1 className="font-[family-name:var(--font-lp-display)] text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--lp-ink)] sm:text-6xl md:text-7xl">
                Master the Art of Communication.
              </h1>
            </Reveal>
            <Reveal delayMs={160}>
              <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-[var(--lp-muted)] sm:text-xl sm:leading-9">
                You weren&apos;t born a poor communicator.
                <br className="hidden sm:block" />
                Nobody ever taught you how to practice.
              </p>
            </Reveal>
            <Reveal delayMs={240}>
              <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="#waitlist"
                  className="inline-flex min-h-12 min-w-[14rem] items-center justify-center rounded-full bg-[var(--lp-ink)] px-8 text-sm font-semibold text-[var(--lp-bg)] transition hover:bg-[var(--lp-ink-soft)]"
                >
                  Join the Founding Members
                </a>
                <Link
                  href="/welcome"
                  className="inline-flex min-h-12 min-w-[14rem] items-center justify-center rounded-full border border-[var(--lp-line)] bg-transparent px-8 text-sm font-semibold text-[var(--lp-ink)] transition hover:bg-white"
                >
                  See TalkForge in Action
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Our Belief */}
        <section
          id="belief"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Our Belief
              </p>
              <blockquote className="mt-8 font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-snug tracking-[-0.03em] text-[var(--lp-ink)] sm:text-4xl sm:leading-[1.25]">
                Nobody should ever feel voiceless because they don&apos;t know
                how to express themselves.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* Experience */}
        <section
          id="experience"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Experience
              </p>
              <h2 className="mt-5 font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                An AI Communication Gym.
              </h2>
            </Reveal>
            <Reveal delayMs={100}>
              <div className="space-y-6 text-lg leading-8 text-[var(--lp-muted)]">
                <p>
                  Most people consume advice about communication. Almost nobody
                  practices it.
                </p>
                <p>
                  TalkForge is where you rehearse high-stakes conversations with
                  Forge — a coach who listens, responds, and helps you improve
                  from what you actually said.
                </p>
                <p className="text-[var(--lp-ink)]">
                  You leave more ready for the real conversation — not more
                  entertained by another tip.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Mission / Journey */}
        <section
          id="mission"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Mission
              </p>
              <h2 className="mx-auto mt-5 max-w-2xl text-center font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                The journey from practice to life.
              </h2>
            </Reveal>

            <ol className="mx-auto mt-16 max-w-xl space-y-0">
              {journey.map((step, index) => (
                <li key={step.title}>
                  <Reveal delayMs={index * 70}>
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lp-line)] bg-white text-sm font-medium text-[var(--lp-ink)]">
                          {index + 1}
                        </span>
                        {index < journey.length - 1 && (
                          <span
                            className="my-2 w-px flex-1 bg-[var(--lp-line)]"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="pb-10">
                        <h3 className="font-[family-name:var(--font-lp-display)] text-2xl font-semibold tracking-[-0.02em]">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-base leading-7 text-[var(--lp-muted)]">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Founding Members */}
        <section
          id="founding"
          className="scroll-mt-24 border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
                Founding Members
              </p>
              <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Help build the world&apos;s communication gym.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--lp-muted)]">
                Founding Members aren&apos;t just early users. You&apos;re the
                first people we practice with — and the people who shape what
                TalkForge becomes.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {foundingBenefits.map((item, index) => (
                <Reveal key={item.title} delayMs={index * 60}>
                  <div className="h-full rounded-3xl border border-[var(--lp-line)] bg-white px-6 py-7">
                    <h3 className="font-[family-name:var(--font-lp-display)] text-xl font-semibold tracking-[-0.02em]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-[var(--lp-muted)]">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
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
                first through the door.
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
                Questions, answered calmly.
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
              Nobody should ever feel voiceless because they don&apos;t know how
              to express themselves.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--lp-muted)]">
                Explore
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-ink)]">
                <li>
                  <a href="#belief" className="hover:opacity-70">
                    Our Belief
                  </a>
                </li>
                <li>
                  <a href="#experience" className="hover:opacity-70">
                    Experience
                  </a>
                </li>
                <li>
                  <a href="#mission" className="hover:opacity-70">
                    Mission
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
                Social
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--lp-ink)]">
                <li>
                  <span className="text-[var(--lp-muted)]">X / Twitter — soon</span>
                </li>
                <li>
                  <span className="text-[var(--lp-muted)]">LinkedIn — soon</span>
                </li>
                <li>
                  <span className="text-[var(--lp-muted)]">Instagram — soon</span>
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
