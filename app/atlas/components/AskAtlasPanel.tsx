"use client";

import { useRef, useState } from "react";

export default function AskAtlasPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    const message = textareaRef.current?.value.trim() ?? "";
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
      if (!res.ok) throw new Error(data.error || "Atlas could not respond.");
      if (!data.response) throw new Error("Atlas returned an empty response.");

      setResponse(data.response);
      if (textareaRef.current) textareaRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Atlas could not respond."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-white/10 pt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Ask Atlas
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Institutional counsel after the operating picture.
          </p>
        </div>
      </div>

      <form onSubmit={handleAsk} className="space-y-4">
        <label className="block" htmlFor="atlas-message">
          <span className="sr-only">Ask Atlas</span>
          <textarea
            id="atlas-message"
            name="message"
            ref={textareaRef}
            rows={3}
            placeholder="Challenge this priority. What am I missing?"
            disabled={loading}
            className="w-full resize-y border border-white/10 bg-[#111318] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="border border-white/15 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Asking Atlas..." : "Ask Atlas"}
        </button>
      </form>

      <div className="mt-6 min-h-16">
        {error ? (
          <p className="text-sm leading-6 text-red-300" role="alert">
            {error}
          </p>
        ) : response ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
            {response}
          </p>
        ) : (
          <p className="text-sm leading-6 text-zinc-600">
            Atlas answers from the Founder Brief, Constitution, Forge Laws,
            Philosophy, Projects, Decisions, Roadmap, and Metrics.
          </p>
        )}
      </div>
    </section>
  );
}
