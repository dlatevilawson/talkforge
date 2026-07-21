"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureGuestUser, updateDisplayName } from "@/lib/auth";
import { getUser } from "@/lib/storage";

const BROUGHT_OPTIONS = [
  {
    id: "upcoming",
    label: "An important conversation is coming up",
    title: "Upcoming conversation",
    success: "Feel clear, calm, and ready to say what matters",
  },
  {
    id: "interview",
    label: "A high-stakes interview or evaluation",
    title: "High-stakes interview practice",
    success: "Structured answers and composure under pressure",
  },
  {
    id: "difficult",
    label: "A difficult conversation I’ve been avoiding",
    title: "Difficult conversation practice",
    success: "Honest, calm, and constructive under tension",
  },
  {
    id: "explore",
    label: "I’m exploring — I just want to practice",
    title: "Open practice with Forge",
    success: "Leave more confident than I arrived",
  },
] as const;

const WELCOME_KEY = "tf_beta_welcomed";

export default function WelcomeExperience() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brought, setBrought] = useState<(typeof BROUGHT_OPTIONS)[number]["id"]>(
    "upcoming"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const user = await getUser();
        const welcomed =
          typeof window !== "undefined" &&
          window.localStorage.getItem(WELCOME_KEY) === "1";
        if (!cancelled && user?.displayName) {
          setName(user.displayName === "Guest" ? "" : user.displayName);
        }
        if (!cancelled && welcomed) {
          setReturning(true);
        }
      } catch {
        // Guest path still works.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBegin(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const displayName = name.trim() || "Friend";
      const existing = await getUser();
      if (existing) {
        await updateDisplayName(displayName);
      } else {
        await ensureGuestUser(displayName);
      }

      const choice =
        BROUGHT_OPTIONS.find((item) => item.id === brought) ?? BROUGHT_OPTIONS[0];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(WELCOME_KEY, "1");
      }

      const params = new URLSearchParams({
        track: brought === "interview" ? "behavioral_tech" : "hello",
        title: choice.title,
        success: choice.success,
      });
      router.push(`/voice?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#07070a] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(59,130,246,0.2),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(255,255,255,0.04),transparent_40%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <p className="text-sm font-medium tracking-wide text-white/70">
            TalkForge
          </p>
          {returning && (
            <Link
              href="/dashboard"
              className="text-sm text-white/40 transition hover:text-white/70"
            >
              Continue
            </Link>
          )}
        </header>

        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-blue-500/20 shadow-[0_0_60px_rgba(59,130,246,0.25)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/30 bg-white/5">
              <span className="text-sm font-medium tracking-wide text-white/90">
                Forge
              </span>
            </div>
          </div>

          <p className="mt-8 text-center text-sm uppercase tracking-[0.28em] text-white/40">
            AI Communication Gym
          </p>
          <h1 className="mt-4 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            {name.trim()
              ? `Welcome, ${name.trim()}. I’ve been expecting you.`
              : "I’ve been expecting you."}
          </h1>
          <p className="mt-5 text-center text-base leading-7 text-white/55">
            You don’t have to perform here. This is practice — a quiet place to
            get ready for the conversations that matter.
          </p>

          <form onSubmit={handleBegin} className="mt-10 space-y-8">
            <label className="block">
              <span className="text-sm text-white/60">What should I call you?</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                autoComplete="given-name"
                disabled={submitting}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <fieldset>
              <legend className="text-sm text-white/60">
                What brought you in today?
              </legend>
              <div className="mt-3 space-y-2">
                {BROUGHT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBrought(option.id)}
                    aria-pressed={brought === option.id}
                    className={`w-full rounded-2xl border px-4 py-3.5 text-left text-sm leading-6 transition ${
                      brought === option.id
                        ? "border-blue-400/45 bg-blue-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="text-sm text-red-300" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {submitting ? "Opening the floor…" : "Begin with Forge"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            One conversation at a time. We’ll start gently — then practice what
            you came for.
          </p>
        </section>
      </div>
    </main>
  );
}
