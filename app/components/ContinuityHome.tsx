"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import styles from "./ContinuityHome.module.css";
import { buildAdaptiveHome } from "@/lib/system2";
import type { AdaptiveHomeModel } from "@/lib/system2";
import {
  APP_HOME_SCREEN_COPY,
  HOME_ALTERNATIVE_CATALOG,
} from "@/lib/system2/home-copy";
import {
  buildHomeAlternatives,
  canStartTraining,
  homeEntitlementFromPractice,
  isExplorerFromSessionHistory,
  practiceEntryHref,
  type HomeAlternative,
  type HomeEntitlement,
  type HomeSessionHistory,
} from "@/lib/system2/home-recommendation";
import type { LivingProfile } from "@/lib/system1/types";
import { CLAIM_FOUNDING_PASS_CTA } from "@/lib/billing/member-copy";
import { countCompletedSessions, getCoachMemory, getUser } from "@/lib/storage";
import type { CoachMemory } from "@/lib/coach/types";
import { STARTER_DRILLS, starterDrillHref } from "@/lib/drills/catalog";
import type { TodayJourney } from "@/lib/journey/types";
import { retryCoachMemoryUpdate } from "@/lib/session";

const homeCopy = APP_HOME_SCREEN_COPY;

function gateMessage(gate: string | null): string | null {
  if (!gate) return null;
  if (gate === "profile_incomplete") {
    return "Your Living Profile is still preparing. Refresh in a moment, then Begin.";
  }
  if (gate === "readiness_unavailable") {
    return "Training isn’t available right now. Check your connection, then try again.";
  }
  if (gate === "unauthenticated") {
    return "Please sign in again to continue training.";
  }
  return "Return to Home for your next step — coaching starts from readiness.";
}

async function loadSessionHistory(userId: string): Promise<HomeSessionHistory> {
  try {
    const completed = await countCompletedSessions(userId);
    return { status: "known", completed };
  } catch {
    return { status: "unknown" };
  }
}

async function loadLivingProfile(): Promise<{
  profile: LivingProfile | null;
  error: string;
}> {
  try {
    const res = await fetch("/api/living-profile", { cache: "no-store" });
    if (!res.ok) {
      return {
        profile: null,
        error: "Couldn’t load your Living Profile. Retry in a moment.",
      };
    }
    const data = (await res.json()) as { profile?: LivingProfile | null };
    const loaded = data.profile ?? null;
    return {
      profile: loaded && loaded.version >= 1 ? loaded : null,
      error: "",
    };
  } catch {
    return {
      profile: null,
      error: "Couldn’t load your Living Profile. Retry in a moment.",
    };
  }
}

async function loadCoachMemory(userId: string): Promise<CoachMemory | null> {
  return getCoachMemory(userId).catch(() => null);
}

async function loadEntitlement(): Promise<HomeEntitlement> {
  try {
    const entRes = await fetch("/api/billing/entitlement", { cache: "no-store" });
    if (!entRes.ok) return { status: "unknown" };
    const entData = (await entRes.json()) as {
      entitlement?: { canStartPractice?: boolean; reason?: string };
    };
    return homeEntitlementFromPractice(entData.entitlement);
  } catch {
    return { status: "unknown" };
  }
}

/**
 * Adaptive Coach Homepage — one readiness-derived recommendation.
 * Alternatives stay secondary (CXA-001). Not a mission menu (IV-REJ-005).
 */
function ContinuityHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gate = searchParams.get("gate");
  const [home, setHome] = useState<AdaptiveHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [enteringTraining, setEnteringTraining] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sessionHistory, setSessionHistory] = useState<HomeSessionHistory>({
    status: "unknown",
  });
  const [entitlement, setEntitlement] = useState<HomeEntitlement>({
    status: "unknown",
  });
  const [todayJourney, setTodayJourney] = useState<TodayJourney | null>(null);

  useEffect(() => {
    router.prefetch("/app/practice?start=1");
    router.prefetch("/app/billing");
    router.prefetch("/app/profile");
    let cancelled = false;

    async function load() {
      try {
        let userId: string | null = null;
        try {
          const user = await getUser();
          userId = user?.id ?? null;
        } catch {
          userId = null;
        }

        if (userId && typeof window !== "undefined") {
          const retryKey = `talkforge:memory-retry:${userId}`;
          const pending = window.localStorage.getItem(retryKey);
          if (pending) {
            try {
              const parsed = JSON.parse(pending) as { sessionId?: string };
              if (parsed.sessionId && (await retryCoachMemoryUpdate(parsed.sessionId))) {
                window.localStorage.removeItem(retryKey);
              }
            } catch (error) {
              console.error("[coach] canonical memory retry failed", error);
            }
          }
        }

        const unknownHistory: HomeSessionHistory = { status: "unknown" };
          const [history, living, memory, access, journey] = await Promise.all([
          userId ? loadSessionHistory(userId) : Promise.resolve(unknownHistory),
          loadLivingProfile(),
          userId ? loadCoachMemory(userId) : Promise.resolve(null),
          loadEntitlement(),
          fetch("/api/journey/today", { cache: "no-store" }).then(async (res) => {
            if (!res.ok) return null;
            const data = (await res.json()) as { journey?: TodayJourney | null };
            return data.journey ?? null;
          }).catch(() => null),
        ]);

        if (cancelled) return;
        setSessionHistory(history);
        setEntitlement(access);
        setTodayJourney(journey);
        if (living.error) setLoadError(living.error);
        if (history.status === "unknown") {
          setLoadError((current) =>
            current ||
            "Couldn’t load your session history. Your Coach recommendation is still from your Living Profile."
          );
        }
        if (access.status === "unknown") {
          setLoadError((current) =>
            current ||
            "Couldn’t confirm practice access. Refresh before starting training."
          );
        }
        const adaptive = buildAdaptiveHome(living.profile);
        const currentFocus = memory?.communicationGoals?.[0] || memory?.topicsWorkingOn?.[0] || memory?.lastScenarioTitle;
        if (currentFocus && memory?.lastSessionAt) {
          const date = new Date(memory.lastSessionAt).toLocaleDateString();
          adaptive.readiness.objective = currentFocus;
          adaptive.recommendation = {
            ...adaptive.recommendation!,
            continuityLine: `Keep working on: ${currentFocus.replace(/[.]+$/, "")}. Last practiced ${date}.`,
          };
        }
        setHome(adaptive);
      } catch {
        if (!cancelled) {
          setHome(buildAdaptiveHome(null));
          setSessionHistory({ status: "unknown" });
          setEntitlement({ status: "unknown" });
          setLoadError("Couldn’t load your session. Refresh and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const readiness = home?.readiness;
  const recommendation = home?.recommendation;
  const isReady = Boolean(readiness?.profileGatePassed);
  const trainingOpen = canStartTraining(entitlement);
  const practiceLimited = entitlement.status === "limited";
  const bounceNote = gateMessage(gate);
  const firstRun =
    sessionHistory.status === "known" && sessionHistory.completed === 0;
  const alternatives = useMemo(
    () =>
      practiceLimited
        ? []
        : buildHomeAlternatives(sessionHistory, HOME_ALTERNATIVE_CATALOG),
    [practiceLimited, sessionHistory]
  );
  const explorer = isExplorerFromSessionHistory(sessionHistory);

  function enterPractice(practiceTitle: string, mode?: "assessment") {
    if (!trainingOpen) return;
    setEnteringTraining(true);
    const dest = practiceEntryHref({ title: practiceTitle, mode });
    window.location.assign(`/app/practice${dest.slice("/app/practice".length)}`);
  }

  function beginRecommended() {
    if (firstRun) {
      if (!trainingOpen) return;
      setEnteringTraining(true);
      window.location.assign(starterDrillHref(STARTER_DRILLS[0]));
      return;
    }
    if (!recommendation || recommendation.href !== "/app/practice") return;
    const title =
      !explorer && readiness?.objective?.trim()
        ? readiness.objective.trim()
        : "";
    enterPractice(title);
  }

  function selectAlternative(option: HomeAlternative) {
    enterPractice(option.practiceTitle, option.mode);
  }

  return (
    <section className={styles.home} aria-labelledby="coach-heading">
      {enteringTraining ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#07070a] text-center tf-training-entry"
          role="status"
          aria-live="polite"
        >
          <div>
            <div className="mx-auto h-20 w-20 rounded-full border border-[#d7b56a]/25 bg-[radial-gradient(circle,#29241a,#090a0b_68%)] shadow-[0_0_70px_rgba(198,151,67,.18)]" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
              Coach Forge
            </p>
            <p className="mt-3 text-lg text-zinc-300">
              Joining TalkForge Arena…
            </p>
          </div>
        </div>
      ) : null}
      <div className={styles.ambient} aria-hidden="true" />

      <div className={styles.copy}>
        <div className={styles.coachLabel}>
          <span className={styles.coachMark} aria-hidden="true">
            <CoachGlyph />
          </span>
          <span>
            <strong>Your Coach</strong>
            <small>Today’s recommendation</small>
          </span>
        </div>

        <h1 id="coach-heading" className={styles.heading}>
          {loading
            ? homeCopy.loadingHeadline
            : isReady
              ? homeCopy.headline
              : homeCopy.notReadyHeadline}
        </h1>

        <div className={styles.recommendation} aria-live="polite">
          <p className={styles.machineName}>Coach Forge</p>
          <p className={styles.focus}>
            {loading ? (
              <span
                className={styles.loadingLine}
                aria-label="Loading recommendation"
              />
            ) : isReady ? (
              recommendation?.continuityLine
            ) : (
              homeCopy.notReadySubheadline
            )}
          </p>
        </div>

        {bounceNote || loadError ? (
          <p className="mt-4 max-w-md text-sm text-amber-100/90" role="status">
            {bounceNote || loadError}
          </p>
        ) : null}

        {practiceLimited && !bounceNote ? (
          <p className="mt-4 max-w-md text-sm leading-6 text-white/55" role="status">
            You’ve completed your complimentary coaching sessions. Claim a
            Founding Pass whenever you’re ready — your account and progress stay
            open to explore.
          </p>
        ) : null}

        <div className={styles.action}>
          {loading ? (
            <button type="button" className={styles.primaryAction} disabled>
              Preparing your session
              <ArrowGlyph />
            </button>
          ) : !isReady ? (
            <>
              <button type="button" className={styles.primaryAction} disabled>
                Preparing your profile
                <ArrowGlyph />
              </button>
              <p className={styles.actionNote}>
                One focused practice. You set the pace.
              </p>
              <Link
                href={starterDrillHref(STARTER_DRILLS[0])}
                className="mt-8 block max-w-md rounded-2xl border border-[#c9a95f]/30 bg-[#c9a95f]/[0.06] p-5 text-left transition hover:border-[#c9a95f]/60"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a95f]">
                  Start here · 3 minutes
                </span>
                <span className="mt-2 block text-lg font-semibold text-white">
                  {STARTER_DRILLS[0].name}
                </span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {STARTER_DRILLS[0].instructions}
                </span>
                <span className="mt-3 block text-sm font-semibold text-[#e4c878]">
                  Open drill →
                </span>
              </Link>
            </>
          ) : todayJourney ? (
            <JourneyTodayCard journey={todayJourney} disabled={enteringTraining} />
          ) : practiceLimited ? (
            <>
              <Link href="/app/billing" className={styles.primaryAction}>
                {CLAIM_FOUNDING_PASS_CTA}
                <ArrowGlyph />
              </Link>
              <p className={styles.actionNote}>
                Training stays locked until a Founding Pass is active.
              </p>
            </>
          ) : !trainingOpen ? (
            <>
              <button type="button" className={styles.primaryAction} disabled>
                Confirming practice access
                <ArrowGlyph />
              </button>
              <p className={styles.actionNote}>
                Refresh to confirm you can start today’s session.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.primaryAction}
                disabled={enteringTraining}
                onClick={beginRecommended}
              >
                {firstRun ? "Start your first drill" : recommendation?.title ?? homeCopy.beginFallback}
                <ArrowGlyph />
              </button>
              {!todayJourney && alternatives.length > 0 ? (
                <div className={styles.alternatives}>
                  <p className={styles.alternativesLabel}>
                    {homeCopy.alternativesLabel}
                  </p>
                  {alternatives.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.alternative}
                      disabled={enteringTraining}
                      onClick={() => selectAlternative(option)}
                    >
                      <span className={styles.alternativeTitle}>
                        {option.title}
                      </span>
                      <span className={styles.alternativeBlurb}>
                        {option.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <p className={styles.actionNote}>
                <Link
                  href={homeCopy.footerHref}
                  className="text-[#c9a95f] underline-offset-4 hover:underline"
                >
                  {homeCopy.footerLink}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.machineArea}>
        <div className={`${styles.status} ${isReady ? styles.readyStatus : ""}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          {loading
            ? "Coach preparing"
            : practiceLimited
              ? "Practice locked"
              : isReady
                ? "Ready to train"
                : "Preparing profile"}
        </div>

        <div
          className={`${styles.machineStage} ${isReady ? styles.machineReady : ""}`}
          role="img"
          aria-label="Coach Forge training equipment"
        >
          <div className={styles.backlight} />
          <div className={styles.machine}>
            <div className={styles.machineCrown}>
              <span>TF</span>
              <i />
            </div>
            <div className={styles.machineShoulder}>
              <span className={styles.shoulderLight} />
            </div>
            <div className={styles.machineFace}>
              <div className={styles.aperture}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.faceCopy}>
                <small>FORGE</small>
                <strong>01</strong>
              </div>
            </div>
            <div className={styles.machineCore}>
              <span className={styles.coreRail} />
              <span className={styles.coreRail} />
              <span className={styles.coreRail} />
              <span className={styles.coreRail} />
              <i className={styles.coreLight} />
            </div>
            <div className={styles.machineBase}>
              <span />
            </div>
          </div>
          <div className={styles.floor}>
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.machineCaption}>
          <span>Equipment 01</span>
          <p>Practice that shapes your life</p>
        </div>
      </div>
    </section>
  );
}

export default function ContinuityHome() {
  return (
    <Suspense
      fallback={
        <section className={styles.home} aria-busy="true">
          <p className={styles.heading}>Preparing today’s training.</p>
        </section>
      }
    >
      <ContinuityHomeInner />
    </Suspense>
  );
}

function CoachGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.25 20 7.6v8.8l-8 4.35-8-4.35V7.6L12 3.25Z" />
      <path d="m8.4 12 2.25 2.25 5-5" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function JourneyTodayCard({ journey, disabled }: { journey: TodayJourney; disabled: boolean }) {
  const href = `/app/practice?drill=${encodeURIComponent(journey.day.drill.slug)}&programId=${encodeURIComponent(journey.day.programId)}&start=0`;
  return (
    <div className="mt-2 max-w-md rounded-3xl border border-[#c9a95f]/35 bg-[#c9a95f]/[0.07] p-5 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c9a95f]">Today · Day {journey.day.dayIndex} of {journey.plan.kind === "6_week" ? "6 weeks" : "6 months"}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{journey.day.drill.name}</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">For {journey.focusSignal}: {journey.goalText}</p>
      {journey.plan.occasionDate ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e4c878]">{daysUntil(journey.plan.occasionDate)} days to go</p> : null}
      <p className="mt-4 text-sm leading-6 text-zinc-200">{journey.day.drill.instructions}</p>
      <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-white/60">Field rep: {journey.day.fieldAssignmentText}</p>
      <Link href={href} aria-disabled={disabled} className="mt-5 inline-flex rounded-full bg-[#f4f0e8] px-5 py-3 font-semibold text-black">Start today’s drill <ArrowGlyph /></Link>
      {journey.tomorrow ? <p className="mt-4 text-xs text-white/45">Tomorrow: {journey.tomorrow.drill.name}</p> : null}
    </div>
  );
}

function daysUntil(date: string): number {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  return Math.max(0, Math.ceil((target - today) / 86_400_000));
}
