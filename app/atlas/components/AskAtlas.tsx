"use client";

import { useState } from "react";

type Message = {
  role: "user" | "atlas";
  text: string;
};

export default function AskAtlas() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const history = messages.map((m) => ({
        role: m.role === "atlas" ? "assistant" : "user",
        content: m.text,
      }));

      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Atlas could not respond.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "atlas", text: data.reply as string },
      ]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Atlas could not respond right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Ask Atlas</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Counsel under the Founding Charter—analysis, challenge, and
          recommendation. Not decisions.
        </p>
      </header>

      <div className="flex min-h-[280px] flex-col px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-md text-center text-sm text-zinc-400">
              Ask about priorities, tradeoffs, mission alignment, or a decision
              that needs clearer thinking.
            </p>
          </div>
        ) : (
          <div className="mb-4 max-h-80 space-y-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-lg px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 bg-zinc-100 text-zinc-800"
                    : "mr-8 border border-zinc-200 bg-zinc-50 text-zinc-800"
                }`}
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {message.role === "user" ? "You" : "Atlas"}
                </p>
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleAsk} className="mt-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What decision deserves attention today?"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </form>
      </div>
    </section>
  );
}
