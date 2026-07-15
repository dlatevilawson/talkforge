"use client";

import Link from "next/link";
import { useState } from "react";

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
};

type CoachResponse = {
  npc: string;
  forge: string;
  error?: string;
};

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
}: TrainingArenaProps) {
  const [missionStarted, setMissionStarted] = useState(false);
  const [message, setMessage] = useState("");
  type ConversationMessage = {
  role: "user" | "npc" | "forge";
  text: string;
};

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnCount, setTurnCount] = useState(0);

async function handleContinue() {
  if (!message.trim()) return;

  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    });

    const data: CoachResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    setConversation((previous) => [
  ...previous,
  {
    role: "user",
    text: message,
  },
  {
    role: "npc",
    text: data.npc,
  },
]);

setTurnCount((count) => count + 1);

    setMessage("");
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder={placeholder}
            className="mt-10 w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-white outline-none placeholder:text-gray-500"
          />

          <button
            onClick={handleContinue}
            disabled={loading}
            className="mt-8 w-full rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Forge is thinking..." : "Continue"}
          </button>

          {error && (
            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
              <p className="text-red-300">
                {error}
              </p>
            </div>
          )}

          
{conversation.length > 0 && (
  <div className="mt-10 space-y-6">

    {conversation.map((item, index) => (
      <div
        key={index}
        className={`rounded-3xl p-6 ${
          item.role === "user"
            ? "bg-white/5 border border-white/10"
            : item.role === "npc"
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-blue-500/10 border border-blue-500/20"
        }`}
      >
        <p className="uppercase tracking-[0.3em] text-sm mb-3">
          {item.role === "user"
            ? "You"
            : item.role === "npc"
            ? "Other Person"
            : "Forge"}
        </p>

        <p className="whitespace-pre-wrap text-lg leading-8">
          {item.text}
        </p>
      </div>
    ))}

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

          <p className="uppercase tracking-[0.3em] text-gray-500">
            {title}
          </p>

          <h1 className="mt-6 text-6xl font-bold">
            {headline}
          </h1>

          <p className="mt-8 mx-auto max-w-2xl text-lg text-gray-400">
            {description}
          </p>

          <div className="mt-16 mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10">

            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Today's Mission
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              {mission}
            </h2>

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

          <div className="mt-12 mx-auto w-full max-w-3xl rounded-3xl border border-blue-500/20 bg-blue-500/10 p-10">

            <p className="uppercase tracking-[0.3em] text-blue-300">
              Meet Your Coach
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              Forge
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-300">
              {coachMessage}
            </p>

            <button
              onClick={() => setMissionStarted(true)}
              className="mt-10 rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400"
            >
              Start Mission
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}