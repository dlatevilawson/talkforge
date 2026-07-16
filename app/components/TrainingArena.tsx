"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type TrainingArenaProps = {
  title: string;
  headline: string;
  description: string;
  mission: string;
  difficulty: string;
  duration: string;
  skill1: string;
  skill2: string;
  skill3: string;
  coachMessage: string;
  missionPrompt: string;
  placeholder: string;
  /** When true (e.g. ?mission=1), render the active mission view from the server. */
  missionStarted?: boolean;
};

type ForgeCoaching = {
  score: number;
  clarity: number;
  confidence: number;
  warmth: number;
  curiosity: number;
  doneWell: string;
  improve: string;
  rewrite: string;
};

type CoachResponse = {
  npc: string;
  forge: ForgeCoaching | string;
  error?: string;
};

type ConversationMessage =
  | { role: "user" | "npc"; text: string }
  | { role: "forge"; coaching: ForgeCoaching };

function clampScore(value: unknown, fallback = 50): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(1, Math.round(n)));
}

function normalizeForge(forge: CoachResponse["forge"]): ForgeCoaching {
  if (typeof forge === "string") {
    return {
      score: 50,
      clarity: 50,
      confidence: 50,
      warmth: 50,
      curiosity: 50,
      doneWell: "You stayed engaged and kept the conversation moving.",
      improve: "Aim for one clearer point and one warmer personal detail next turn.",
      rewrite: forge,
    };
  }

  return {
    score: clampScore(forge.score),
    clarity: clampScore(forge.clarity),
    confidence: clampScore(forge.confidence),
    warmth: clampScore(forge.warmth),
    curiosity: clampScore(forge.curiosity),
    doneWell:
      forge.doneWell?.trim() ||
      "You stayed engaged and kept the conversation moving.",
    improve:
      forge.improve?.trim() ||
      "Aim for one clearer point and one warmer personal detail next turn.",
    rewrite: forge.rewrite?.trim() || "",
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-blue-100/80">{label}</span>
        <span className="font-medium text-blue-100">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-400 transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ForgeCoachCard({ coaching }: { coaching: ForgeCoaching }) {
  return (
    <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-blue-300">
            Forge
          </p>
          <p className="text-lg text-blue-100/90">Communication coaching</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200/70">
            Overall
          </p>
          <p className="mt-1 text-4xl font-bold text-white">{coaching.score}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreBar label="Clarity" value={coaching.clarity} />
        <ScoreBar label="Confidence" value={coaching.confidence} />
        <ScoreBar label="Warmth" value={coaching.warmth} />
        <ScoreBar label="Curiosity" value={coaching.curiosity} />
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300/90">
            Done well
          </p>
          <p className="mt-2 text-lg leading-8 text-gray-100">
            {coaching.doneWell}
          </p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300/90">
            Try this
          </p>
          <p className="mt-2 text-lg leading-8 text-gray-100">
            {coaching.improve}
          </p>
        </div>

        {coaching.rewrite && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">
              Stronger version
            </p>
            <p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-white">
              {coaching.rewrite}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrainingArena({
  title,
  headline,
  description,
  mission,
  difficulty,
  duration,
  skill1,
  skill2,
  skill3,
  coachMessage,
  missionPrompt,
  placeholder,
  missionStarted = false,
}: TrainingArenaProps) {
  // Uncontrolled textarea: text typed before hydration stays in the DOM and is
  // readable on Continue (controlled `message` state stayed "" → silent no-op).
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    const text = textareaRef.current?.value.trim() ?? "";
    if (!text) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data: CoachResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const coaching = normalizeForge(data.forge);

      setConversation((previous) => [
        ...previous,
        {
          role: "user",
          text,
        },
        {
          role: "npc",
          text: data.npc,
        },
        {
          role: "forge",
          coaching,
        },
      ]);

      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    } catch (err) {
      console.error(err);

      setError("Forge couldn't respond right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (missionStarted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black px-6 text-white">
        <div className="mx-auto max-w-3xl py-10">
          <Link
            href="/training"
            className="inline-flex items-center text-gray-400 transition hover:text-white"
          >
            ← Back to Training
          </Link>

          <p className="mt-10 text-center uppercase tracking-[0.3em] text-gray-400">
            Forge
          </p>

          <h1 className="mt-6 text-center text-5xl font-bold">
            Welcome to your mission.
          </h1>

          <p className="mt-6 text-center text-lg leading-8 text-gray-400">
            {missionPrompt}
          </p>

          <textarea
            ref={textareaRef}
            rows={6}
            placeholder={placeholder}
            className="mt-10 w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-white outline-none placeholder:text-gray-500"
          />

          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className="mt-8 w-full rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Forge is thinking..." : "Continue"}
          </button>

          {error && (
            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {conversation.length > 0 && (
            <div className="mt-10 space-y-6">
              {conversation.map((item, index) =>
                item.role === "forge" ? (
                  <ForgeCoachCard key={index} coaching={item.coaching} />
                ) : (
                  <div
                    key={index}
                    className={`rounded-3xl p-6 ${
                      item.role === "user"
                        ? "border border-white/10 bg-white/5"
                        : "border border-green-500/20 bg-green-500/10"
                    }`}
                  >
                    <p className="mb-3 text-sm uppercase tracking-[0.3em]">
                      {item.role === "user" ? "You" : "Other Person"}
                    </p>

                    <p className="whitespace-pre-wrap text-lg leading-8">
                      {item.text}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/training"
          className="inline-flex items-center text-gray-400 transition hover:text-white"
        >
          ← Back to Training
        </Link>

        <div className="mt-10 text-center">
          <p className="uppercase tracking-[0.3em] text-gray-500">{title}</p>

          <h1 className="mt-6 text-6xl font-bold">{headline}</h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-400">
            {description}
          </p>

          <div className="mx-auto mt-16 w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Today&apos;s Mission
            </p>

            <h2 className="mt-4 text-3xl font-bold">{mission}</h2>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2">
                {difficulty}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2">
                {duration}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2">
                {skill1}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2">
                {skill2}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2">
                {skill3}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-3xl rounded-3xl border border-blue-500/20 bg-blue-500/10 p-10">
            <p className="uppercase tracking-[0.3em] text-blue-300">
              Meet Your Coach
            </p>

            <h2 className="mt-4 text-3xl font-bold">Forge</h2>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              {coachMessage}
            </p>

            <Link
              href="?mission=1"
              scroll={true}
              className="mt-10 inline-flex rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400"
            >
              Start Mission
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
