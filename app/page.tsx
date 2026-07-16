import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black font-sans text-white">
      <nav className="mx-auto mt-6 flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl sm:mt-8 sm:px-8 sm:py-4">
        <h1 className="text-lg font-semibold tracking-wide sm:text-xl">
          TalkForge
        </h1>

        <Link
          href="/auth"
          className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black sm:px-5"
        >
          Sign In
        </Link>
      </nav>

      <section className="flex flex-col items-center px-6 pt-16 text-center sm:pt-20">
        <div
          className="mb-10 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl sm:h-36 sm:w-36"
          aria-hidden="true"
        />

        <p className="uppercase tracking-[0.3em] text-gray-400">
          AI Communication Gym
        </p>

        <h2 className="mt-6 max-w-4xl text-4xl font-bold sm:text-6xl">
          There Is No Limit
          <br />
          To Who You Can Become.
        </h2>

        <p className="mt-6 max-w-2xl text-base text-gray-400 sm:text-lg">
          Practice real conversations with an AI coach that gives instant
          feedback, tracks your progress, and helps you become a more confident
          communicator—one conversation at a time.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth"
            className="rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
          >
            Start Forging
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
          >
            Open Dashboard
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6 pb-20 sm:mt-40">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Why People Choose TalkForge
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3 sm:mt-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">Practice</h3>
            <p className="mt-4 text-gray-400">
              Improve through realistic conversations instead of reading another
              course.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">Feedback</h3>
            <p className="mt-4 text-gray-400">
              Receive instant AI coaching on clarity, confidence, pacing, and
              storytelling.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">Grow</h3>
            <p className="mt-4 text-gray-400">
              Build communication skills that improve your career, leadership,
              negotiation, and relationships.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
