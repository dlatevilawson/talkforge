import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <nav className="mx-auto mt-8 flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-semibold tracking-wide">
          TalkForge
        </h1>

        <button className="rounded-full border border-white/20 px-5 py-2 transition hover:bg-white hover:text-black">
          Sign In
        </button>
      </nav>

      <section className="flex flex-col items-center px-6 pt-20 text-center">
        <div className="mb-10 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl"></div>

        <p className="uppercase tracking-[0.3em] text-gray-400">
          AI Communication Gym
        </p>

        <h2 className="mt-6 max-w-4xl text-6xl font-bold">
          There Is No Limit
          <br />
          To Who You Can Become.
        </h2>

        <p className="mt-6 max-w-2xl text-lg text-gray-400">
          Practice real conversations with an AI coach that gives instant
          feedback, tracks your progress, and helps you become a more confident
          communicator—one conversation at a time.
        </p>

        <Link
          href="/training"
          className="mt-10 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-105 hover:bg-gray-200"
        >
          Start Forging
        </Link>
      </section>

      <section className="mx-auto mt-40 max-w-6xl px-6">
        <h2 className="text-center text-4xl font-bold">
          Why People Choose TalkForge
        </h2>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">
              Practice
            </h3>

            <p className="mt-4 text-gray-400">
              Improve through realistic conversations instead of reading another
              course.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">
              Feedback
            </h3>

            <p className="mt-4 text-gray-400">
              Receive instant AI coaching on clarity, confidence, pacing, and
              storytelling.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-semibold">
              Grow
            </h3>

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