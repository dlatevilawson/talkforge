"use client";

import { useState } from "react";

export default function FounderConsole() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    setError("");
    setResponse("");
    setLoading(true);

    try {
      const res = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = (await res.json()) as { response?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Atlas could not respond.");
      }

      if (!data.response) {
        throw new Error("Atlas returned an empty response.");
      }

      setResponse(data.response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Atlas could not respond."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="border-b border-white/10 pb-10">
        <h1 className="text-4xl font-semibold tracking-[0.28em] text-zinc-100">
          ATLAS
        </h1>
        <p className="mt-4 text-sm text-zinc-500">Founder console</p>
      </header>

      <form onSubmit={handleAsk} className="mt-10 space-y-5">
        <label className="block">
          <span className="text-sm text-zinc-400">Ask Atlas...</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="What should we prioritize this week?"
            disabled={loading}
            className="mt-3 w-full resize-y rounded-md border border-white/10 bg-[#111318] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md border border-white/15 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Asking Atlas..." : "Ask Atlas"}
        </button>
      </form>

      <section className="mt-12 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          Response
        </h2>

        {error ? (
          <p className="mt-4 text-sm leading-6 text-red-300">{error}</p>
        ) : response ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200">
            {response}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Atlas will answer here using the Founder Brief, Constitution, Forge
            Laws, Philosophy, Projects, and Decisions.
          </p>
        )}
      </section>
    </div>
  );
}
