import Link from "next/link";

export default function TrainingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white flex items-center justify-center px-6">
      <section className="max-w-3xl text-center">

        <p className="uppercase tracking-[0.3em] text-gray-400">
          Welcome Home
        </p>

        <h1 className="mt-6 text-5xl font-bold">
          What would you like to forge today?
        </h1>

        <p className="mt-6 text-lg text-gray-400">
          Every conversation is another opportunity to become more confident,
          more thoughtful, and more capable.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">

          <Link
            href="/small-talk"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            🗣 Small Talk
          </Link>

          <Link
            href="/interview"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            💼 Interview
          </Link>

          <Link
            href="/leadership"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            👥 Leadership
          </Link>

          <Link
            href="/negotiation"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            🤝 Negotiation
          </Link>

          <Link
            href="/storytelling"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            📖 Storytelling
          </Link>

          <Link
            href="/difficult-conversations"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
          >
            ❤️ Difficult Conversations
          </Link>

        </div>

      </section>
    </main>
  );
}