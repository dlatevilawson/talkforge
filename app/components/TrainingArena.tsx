"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  completePracticeSession,
  createPracticeSession,
  persistActiveSession,
} from "@/lib/session";
import type { ConversationTurn, ForgeCoaching, PracticeSession } from "@/lib/types";

type TrainingArenaProps = {
  scenarioId: string;
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

type CoachResponse = {
  npc: string;
  forge: ForgeCoaching | string;
  error?: string;
};

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
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`${label} score`}
        aria-valuemin={1}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full bg-blue-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ForgeCoachCard({ coaching }: { coaching: ForgeCoaching }) {
  return (
    <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5 sm:p-6">
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
          <p className="mt-2 text-base leading-7 text-gray-100 sm:text-lg sm:leading-8">
            {coaching.doneWell}
          </p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300/90">
            Try this
          </p>
          <p className="mt-2 text-base leading-7 text-gray-100 sm:text-lg sm:leading-8">
            {coaching.improve}
          </p>
        </div>

        {coaching.rewrite && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">
              Stronger version
            </p>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-white sm:text-lg sm:leading-8">
              {coaching.rewrite}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrainingArena({
  scenarioId,
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
  const router = useRouter();
  // Uncontrolled textarea: text typed before hydration stays in the DOM and is
  // readable on Continue (controlled `message` state stayed "" → silent no-op).
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const sessionInitialized = useRef(false);

  useEffect(() => {
    if (!missionStarted || sessionInitialized.current) return;
    sessionInitialized.current = true;

    let cancelled = false;

    async function startSession() {
      try {
        const next = await createPracticeSession({
          scenarioId,
          scenarioTitle: title,
          missionPrompt,
        });
        if (!cancelled) {
          setSession(next);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not start practice session in Supabase."
          );
        }
      }
    }

    void startSession();
    return () => {
      cancelled = true;
    };
  }, [missionStarted, scenarioId, title, missionPrompt]);

  useEffect(() => {
    if (conversation.length === 0) return;
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [conversation]);

  async function handleContinue() {
    const text = textareaRef.current?.value.trim() ?? "";
    if (!text || loading) return;

    if (!session) {
      setError("Session is still starting. Please try Continue again.");
      return;
    }

    const history = conversation
      .filter(
        (item): item is { role: "user" | "npc"; text: string } =>
          item.role === "user" || item.role === "npc"
      )
      .map((item) => ({
        role: item.role,
        text: item.text,
      }));

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
          history,
          scenario: {
            id: scenarioId,
            title,
            mission,
            missionPrompt,
          },
        }),
      });

      const data: CoachResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (typeof data.npc !== "string" || !data.npc.trim()) {
        throw new Error("Forge returned an empty reply.");
      }

      const coaching = normalizeForge(data.forge);
      const nextTurns: ConversationTurn[] = [
        ...conversation,
        { role: "user", text },
        { role: "npc", text: data.npc.trim() },
        { role: "forge", coaching },
      ];

      const updated = await persistActiveSession(session, nextTurns);
      setConversation(nextTurns);
      setSession(updated);

      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Forge couldn't respond right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEndMission() {
    if (!session || ending) return;

    if (conversation.length === 0) {
      setError("Complete at least one exchange before ending the mission.");
      return;
    }

    setEnding(true);
    setError("");

    try {
      const completed = await completePracticeSession(session, conversation);
      router.push(`/reflect/${completed.id}`);
    } catch (err) {
      console.error(err);
      setEnding(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete session in Supabase."
      );
    }
  }

  if (missionStarted) {
    const canEnd = conversation.some((item) => item.role === "forge");

    return (
      <main className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-950 to-black px-4 text-white sm:px-6">
        <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col py-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/training"
              className="inline-flex items-center text-gray-400 transition hover:text-white"
            >
              ← Back to Practice
            </Link>
            <button
              type="button"
              onClick={handleEndMission}
              disabled={!canEnd || loading || ending}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ending ? "Ending..." : "End Mission"}
            </button>
          </div>

          <p className="mt-8 text-center text-sm uppercase tracking-[0.3em] text-gray-400">
            Forge
          </p>

          <h1 className="mt-4 text-center text-3xl font-bold sm:text-5xl">
            Welcome to your mission.
          </h1>

          <p className="mt-4 text-center text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
            {missionPrompt}
          </p>

          <div
            className="mt-8 min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
            aria-live="polite"
            aria-busy={loading}
          >
            {conversation.length === 0 ? (
              <p className="text-center text-sm text-zinc-400">
                Your conversation with the other person and Forge coaching will
                appear here.
              </p>
            ) : (
              conversation.map((item, index) =>
                item.role === "forge" ? (
                  <ForgeCoachCard key={index} coaching={item.coaching} />
                ) : (
                  <div
                    key={index}
                    className={`rounded-3xl p-5 sm:p-6 ${
                      item.role === "user"
                        ? "border border-white/10 bg-white/5"
                        : "border border-green-500/20 bg-green-500/10"
                    }`}
                  >
                    <p className="mb-3 text-sm uppercase tracking-[0.3em]">
                      {item.role === "user" ? "You" : "Other Person"}
                    </p>
                    <p className="whitespace-pre-wrap text-base leading-7 text-white sm:text-lg sm:leading-8">
                      {item.text}
                    </p>
                  </div>
                )
              )
            )}
            <div ref={conversationEndRef} />
          </div>

          {error && (
            <div
              id="mission-error"
              className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
              role="alert"
            >
              <p className="text-red-300">{error}</p>
            </div>
          )}

          <div className="sticky bottom-0 mt-4 border-t border-white/10 bg-gradient-to-t from-black via-black to-transparent pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <label className="block" htmlFor="mission-reply">
              <span className="sr-only">Your reply</span>
              <textarea
                id="mission-reply"
                name="message"
                ref={textareaRef}
                rows={3}
                placeholder={placeholder}
                disabled={loading || ending}
                aria-describedby={error ? "mission-error" : undefined}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
              />
            </label>

            <button
              type="button"
              onClick={handleContinue}
              disabled={loading || ending}
              className="mt-4 w-full rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Forge is thinking..." : "Continue"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/training"
          className="inline-flex items-center text-gray-400 transition hover:text-white"
        >
          ← Back to Practice
        </Link>

        <div className="mt-10 text-center">
          <p className="uppercase tracking-[0.3em] text-gray-500">{title}</p>

          <h1 className="mt-6 text-4xl font-bold sm:text-6xl">{headline}</h1>

          <p className="mx-auto mt-8 max-w-2xl text-base text-gray-400 sm:text-lg">
            {description}
          </p>

          <div className="mx-auto mt-12 w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 sm:mt-16 sm:p-10">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Today&apos;s Mission
            </p>

            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{mission}</h2>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {difficulty}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {duration}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {skill1}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {skill2}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {skill3}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-10 w-full max-w-3xl rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 sm:mt-12 sm:p-10">
            <p className="uppercase tracking-[0.3em] text-blue-300">
              Meet Your Coach
            </p>

            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Forge</h2>

            <p className="mt-6 text-base leading-7 text-gray-300 sm:text-lg sm:leading-8">
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
