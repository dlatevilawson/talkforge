"use client";

import ExecutiveMachine from "@/app/components/ExecutiveMachine";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAdaptiveHome } from "@/lib/system2";
import type { AdaptiveHomeModel } from "@/lib/system2";
import { emptyLivingProfile } from "@/lib/system1/profile";
import type { LivingProfile } from "@/lib/system1/types";
import { getGrowthSummary, getUser } from "@/lib/storage";
import type { GrowthSummary } from "@/lib/types";

const TRAINING_PRESET = {
  duration: "8–12 min",
  durationDetail: "One focused round",
} as const;

const EMPTY_GROWTH: GrowthSummary = {
  sessionsCompleted: 0,
  averageScore: 0,
  hoursPracticed: 0,
  longestConversationSeconds: 0,
  bestScore: 0,
  streakDays: 0,
  averageFillerWords: 0,
  averageSpeakingPaceWpm: null,
  skills: {
    confidence: 0,
    empathy: 0,
    listening: 0,
    clarity: 0,
    storytelling: 0,
    negotiation: 0,
    leadership: 0,
  },
  trend30d: [],
  adaptiveInsight: null,
  lastSessionAt: null,
  lastScenarioTitle: null,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? "";
}

function intensityLabel(
  intensity: LivingProfile["coachingIntensity"] | undefined
): string {
  if (intensity === "gentle") return "Gentle";
  if (intensity === "direct") return "Direct";
  if (intensity === "challenging") return "Challenging";
  return "Steady";
}

/**
 * Adaptive Homepage — the Coach.
 * One readiness-led recommendation; supporting context never becomes a menu.
 */
export default function ContinuityHome() {
  const [home, setHome] = useState<AdaptiveHomeModel | null>(null);
  const [profile, setProfile] = useState<LivingProfile | null>(null);
  const [growth, setGrowth] = useState<GrowthSummary>(EMPTY_GROWTH);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await getUser();
        let livingProfile: LivingProfile | null = null;
        if (user?.id) {
          setDisplayName(
            user.displayName && user.displayName !== "Guest"
              ? firstName(user.displayName)
              : ""
          );
          try {
            const [res, growthSummary] = await Promise.all([
              fetch("/api/living-profile", { cache: "no-store" }),
              getGrowthSummary(user.id),
            ]);
            if (res.ok) {
              const data = (await res.json()) as { profile?: LivingProfile | null };
              livingProfile = data.profile ?? null;
            }
            if (!cancelled) setGrowth(growthSummary);
          } catch {
            // Soft-fail: recommendation remains available without progress data.
          }
          if (!livingProfile) {
            livingProfile = emptyLivingProfile(user.id, user.displayName ?? "");
          }
        }
        if (!cancelled) {
          setProfile(livingProfile);
          setHome(buildAdaptiveHome(livingProfile));
        }
      } catch {
        if (!cancelled) {
          setHome(buildAdaptiveHome(null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendation = home?.recommendation;
  const readiness = home?.readiness;
  const ready = Boolean(readiness?.profileGatePassed);
  const intensity = intensityLabel(profile?.coachingIntensity);
  const objective = readiness?.objective?.trim();
  const greetingName =
    profile?.preferredNickname.trim() ||
    firstName(profile?.displayName ?? "") ||
    displayName;
  const trainingTitle = ready
    ? objective
      ? "Practice what matters now."
      : "Strengthen your voice."
    : "Build your training plan.";
  const whyToday = ready
    ? recommendation?.continuityLine ??
      "A focused round keeps the conversation you care about within reach."
    : "A few details about who you are becoming help Forge choose the right work.";
  const ctaHref = ready
    ? recommendation?.href ?? "/app/practice"
    : "/app/profile";
  const ctaLabel = ready ? "Begin Training" : "Set Up My Training";
  const progressLine =
    growth.sessionsCompleted > 0
      ? `${growth.sessionsCompleted} focused ${
          growth.sessionsCompleted === 1 ? "session" : "sessions"
        } completed${
          growth.streakDays > 1 ? ` · ${growth.streakDays}-day rhythm` : ""
        }.`
      : "Your first completed round begins your training history.";

  return (
    <main className="tf-home -mx-4 -mt-8 overflow-hidden px-4 pb-16 sm:-mx-6 sm:px-6 lg:pb-24">
      <section
        className="relative mx-auto min-h-[calc(100svh-5rem)] max-w-7xl pt-8 sm:pt-12 lg:grid lg:grid-cols-[minmax(0,1.03fr)_minmax(22rem,.97fr)] lg:items-center lg:gap-8 lg:pt-5"
        aria-labelledby="today-training"
      >
        <div className="pointer-events-none absolute left-[-20%] top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#d0a75b]/[0.055] blur-[120px]" />

        <div className="relative z-10 tf-home-settle">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
            {loading
              ? "Preparing your gym"
              : `${getGreeting()}${greetingName ? `, ${greetingName}` : ""}`}
          </p>

          {deferred ? (
            <div
              className="mt-8 max-w-xl rounded-[1.75rem] border border-white/[0.09] bg-white/[0.035] p-6 sm:p-8"
              role="status"
            >
              <p className="text-sm font-medium text-zinc-200">
                No pressure. Your training will be here.
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                A good practice starts when you can give it your attention.
              </p>
              <button
                type="button"
                onClick={() => setDeferred(false)}
                className="mt-5 min-h-11 rounded-full border border-white/10 px-5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                Show today’s training
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-8 bg-[#c9a95f]/60" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Today’s training
                </p>
              </div>

              <h1
                id="today-training"
                className="mt-5 max-w-3xl text-[clamp(2.8rem,8.5vw,5.9rem)] font-medium leading-[0.94] tracking-[-0.055em] text-[#f5f2eb]"
              >
                {loading ? "Finding your next rep." : trainingTitle}
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
                {loading
                  ? "Forge is reading your focus and preparing one clear next step."
                  : whyToday}
              </p>

              <dl className="mt-7 grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08]">
                <div className="bg-[#090a0b]/95 px-4 py-4 sm:px-5">
                  <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-600">
                    Duration
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-zinc-100">
                    {TRAINING_PRESET.duration}
                  </dd>
                  <dd className="mt-0.5 text-xs text-zinc-600">
                    {TRAINING_PRESET.durationDetail}
                  </dd>
                </div>
                <div className="bg-[#090a0b]/95 px-4 py-4 sm:px-5">
                  <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-600">
                    Coaching
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-zinc-100">
                    {intensity}
                  </dd>
                  <dd className="mt-0.5 text-xs text-zinc-600">
                    Matched to your profile
                  </dd>
                </div>
              </dl>

              <div className="mt-7 flex max-w-lg flex-col gap-3 sm:flex-row">
                <Link
                  href={ctaHref}
                  aria-disabled={loading}
                  className={`group inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-[#f0e6cf] px-7 text-sm font-semibold text-[#17140f] shadow-[0_14px_38px_rgba(198,158,80,.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff8e9] hover:shadow-[0_18px_48px_rgba(198,158,80,.2)] ${
                    loading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {ctaLabel}
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    <path
                      d="M4 10h11m-4-4 4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => setDeferred(true)}
                  disabled={loading}
                  className="min-h-14 rounded-full px-6 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-50"
                >
                  Not today
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative order-first mx-auto mt-4 w-full max-w-[31rem] lg:order-none lg:mt-0 lg:max-w-none">
          <ExecutiveMachine ready={!loading && ready} intensity={intensity} />
          <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 text-center lg:bottom-[6%]">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-zinc-600">
              Executive Machine
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl border-t border-white/[0.07]">
        <section className="grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-600">
              Current focus
            </p>
            <h2 className="mt-4 max-w-xl text-2xl font-medium leading-tight tracking-[-0.025em] text-zinc-100 sm:text-3xl">
              {objective || "Give Forge the context to coach you well."}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
              {ready
                ? "Your Living Profile keeps today’s work connected to who you are becoming."
                : "Your recommendation becomes personal once your Living Profile has a starting point."}
            </p>
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-600">
              Meaningful progress
            </p>
            <p className="mt-4 text-2xl font-medium tracking-[-0.025em] text-zinc-100 sm:text-3xl">
              {progressLine}
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {growth.lastScenarioTitle
                ? `Last practiced: ${growth.lastScenarioTitle}.`
                : "Progress begins with practice, not a perfect score."}
            </p>
            <Link
              href="/app/progress"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-zinc-400 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-white/40"
            >
              See your progress
            </Link>
          </div>
        </section>

        <section className="border-t border-white/[0.07] py-12 sm:py-16">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Explore the gym
              </p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.025em] text-zinc-100">
                Your training, when you need it.
              </h2>
            </div>
            <nav
              aria-label="Explore the gym"
              className="flex flex-col gap-2 sm:min-w-[22rem]"
            >
              {[
                {
                  href: ready ? "/app/practice" : "/app/profile",
                  label: ready ? "Training Room" : "Set up training",
                },
                { href: "/app/progress", label: "Progress" },
                { href: "/app/profile", label: "Living Profile" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex min-h-12 items-center justify-between border-b border-white/[0.07] text-sm text-zinc-400 transition hover:border-white/15 hover:text-white"
                >
                  {item.label}
                  <span
                    className="text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
