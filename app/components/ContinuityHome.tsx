"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./ContinuityHome.module.css";
import { buildAdaptiveHome } from "@/lib/system2";
import type { AdaptiveHomeModel } from "@/lib/system2";
import { emptyLivingProfile } from "@/lib/system1/profile";
import type { LivingProfile } from "@/lib/system1/types";
import { getUser } from "@/lib/storage";

/**
 * Adaptive Coach Homepage — AUDIT-001 C3 remediation.
 * Single continuity CTA. No mission menu, analytics, or invented readiness.
 */
export default function ContinuityHome() {
  const router = useRouter();
  const [home, setHome] = useState<AdaptiveHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [enteringTraining, setEnteringTraining] = useState(false);

  useEffect(() => {
    router.prefetch("/app/practice?start=1");
    let cancelled = false;

    async function load() {
      try {
        const user = await getUser();
        let profile: LivingProfile | null = null;
        if (user?.id) {
          try {
            const res = await fetch("/api/living-profile", { cache: "no-store" });
            if (res.ok) {
              const data = (await res.json()) as { profile?: LivingProfile | null };
              profile = data.profile ?? null;
            }
          } catch {
            // Soft-fail: continuity remains available without the LP table.
          }
          if (!profile) {
            profile = emptyLivingProfile(user.id, user.displayName ?? "");
          }
        }
        if (!cancelled) {
          setHome(buildAdaptiveHome(profile));
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
  }, [router]);

  const readiness = home?.readiness;
  const isReady = Boolean(readiness?.profileGatePassed);
  const focus = readiness?.objective;

  const heading = loading
    ? "Preparing today’s training."
    : isReady
      ? "Today, we’re training this."
      : "Your training starts with context.";

  const coachNote = loading
    ? "Your Coach is reviewing what matters now."
    : isReady
      ? "One focused session, chosen from what you’ve said matters now."
      : "Tell your Coach what matters so it can recommend one useful place to begin.";

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
              Joining your Training Room…
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
          {heading}
        </h1>

        <div className={styles.recommendation} aria-live="polite">
          <p className={styles.machineName}>Executive Machine</p>
          <p className={styles.focus}>
            {loading ? (
              <span className={styles.loadingLine} aria-label="Loading recommendation" />
            ) : isReady ? (
              focus ?? "Practice the conversation that matters now."
            ) : (
              "Standing by for your direction."
            )}
          </p>
        </div>

        <div className={styles.reason}>
          <span className={styles.reasonLine} aria-hidden="true" />
          <p>{coachNote}</p>
        </div>

        <div className={styles.action}>
          {loading ? (
            <button type="button" className={styles.primaryAction} disabled>
              Preparing your session
              <ArrowGlyph />
            </button>
          ) : isReady ? (
            <button
              type="button"
              onClick={() => {
                setEnteringTraining(true);
                const trainingParams = new URLSearchParams({ start: "1" });
                if (focus) trainingParams.set("title", focus);
                window.location.assign(`/app/practice?${trainingParams.toString()}`);
              }}
              disabled={enteringTraining}
              className={styles.primaryAction}
            >
              Begin today’s training
              <ArrowGlyph />
            </button>
          ) : (
            <Link href="/app/profile" className={styles.primaryAction}>
              Set your training focus
              <ArrowGlyph />
            </Link>
          )}
          <p className={styles.actionNote}>One focused practice. You set the pace.</p>
        </div>
      </div>

      <div className={styles.machineArea}>
        <div className={`${styles.status} ${isReady ? styles.readyStatus : ""}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          {loading ? "Coach preparing" : isReady ? "Ready to train" : "Awaiting context"}
        </div>

        <div
          className={`${styles.machineStage} ${isReady ? styles.machineReady : ""}`}
          role="img"
          aria-label="Executive Machine, specialized equipment for focused communication practice"
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
                <small>EXECUTIVE</small>
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
          <p>Clarity under pressure</p>
        </div>
      </div>
    </section>
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
