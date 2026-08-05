"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeOnboardingAction,
  type AuthActionState,
} from "@/app/actions/auth";
import {
  TRAINING_FOCUS_OPTIONS,
  type TrainingFocusOption,
} from "@/lib/system2/training-focus";
import styles from "./DiscoverGym.module.css";

function HiddenPrefs({
  displayName,
  purposeStatement = "",
  seasonLabel = "",
  next,
}: {
  displayName: string;
  purposeStatement?: string;
  seasonLabel?: string;
  next: string;
}) {
  const firstName = displayName.split(" ")[0] || "";
  return (
    <>
      <input type="hidden" name="purposeStatement" value={purposeStatement} />
      <input type="hidden" name="seasonLabel" value={seasonLabel} />
      <input type="hidden" name="preferredNickname" value={firstName} />
      <input
        type="hidden"
        name="timeZone"
        value={
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC"
        }
      />
      <input type="hidden" name="preferredLanguage" value="en" />
      <input type="hidden" name="next" value={next} />
    </>
  );
}

function PendingSubmit({
  className,
  label,
  pendingLabel,
}: {
  className: string;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Post-signup Discover gym floor (IV-UX-010).
 * Welcome → curiosity → conversation or free Machine exploration.
 * Living Profile is not collected here.
 */
export default function DiscoverGym({ displayName }: { displayName: string }) {
  const [state, action] = useActionState(
    completeOnboardingAction,
    {} as AuthActionState
  );
  const [preview, setPreview] = useState<TrainingFocusOption | null>(null);
  const [explorePulse, setExplorePulse] = useState(false);
  const machinesRef = useRef<HTMLElement>(null);
  const drawerTitleId = useId();
  const firstName = displayName.split(" ")[0] || "there";

  useEffect(() => {
    if (!preview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  function exploreMachines() {
    setExplorePulse(true);
    machinesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setExplorePulse(false), 1200);
  }

  const forgeNext =
    "/app/practice?start=1&title=" +
    encodeURIComponent("What brings you in today?");

  return (
    <div className={styles.page}>
      <div className={styles.ambient} aria-hidden />
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          TalkForge
        </Link>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Welcome{firstName ? `, ${firstName}` : ""}</p>
          <h1 className={styles.title}>
            Walk into the Communication Gym.
          </h1>
          <p className={styles.lede}>
            TalkForge is where you practice the conversations that shape your
            life — with Forge, your AI coach, and Machines built for real
            pressure. Explore freely. No forms. No commitment yet.
          </p>
        </header>

        <div className={styles.paths}>
          <form action={action}>
            <HiddenPrefs displayName={displayName} next={forgeNext} />
            <PendingSubmit
              className={styles.primaryPath}
              label="Start with Forge"
              pendingLabel="Opening Forge…"
            />
          </form>
          <button
            type="button"
            className={styles.secondaryPath}
            onClick={exploreMachines}
          >
            Explore Machines
          </button>
        </div>
        <p className={styles.pathHint}>
          Forge learns what you need through conversation — you can refine your
          profile later.
        </p>
        {state.message ? (
          <p className={styles.alert} role="alert">
            {state.message}
          </p>
        ) : null}

        <section
          ref={machinesRef}
          id="machines"
          className={styles.machines}
          aria-labelledby="machines-heading"
        >
          <div className={styles.machinesHead}>
            <div>
              <p className={styles.eyebrow}>The floor</p>
              <h2 id="machines-heading">Machines you can train on</h2>
            </div>
            <p>
              Tap any Machine for a preview. Browse with curiosity — start when
              you’re ready.
            </p>
          </div>

          <ul
            className={styles.grid}
            role="list"
            data-pulse={explorePulse ? "1" : undefined}
          >
            {TRAINING_FOCUS_OPTIONS.map((machine, index) => {
              const active = preview?.id === machine.id;
              return (
                <li key={machine.id} style={{ ["--i" as string]: index }}>
                  <button
                    type="button"
                    className={`${styles.card} ${active ? styles.cardActive : ""}`}
                    data-accent={machine.accent}
                    onClick={() => setPreview(machine)}
                    aria-expanded={active}
                  >
                    <div className={styles.meta}>
                      <span className={styles.chip}>{machine.category}</span>
                      <span className={styles.chip}>{machine.difficulty}</span>
                    </div>
                    <p className={styles.number}>{machine.number}</p>
                    <p className={styles.machineTitle}>{machine.title}</p>
                    <p className={styles.blurb}>{machine.blurb}</p>
                    <div className={styles.cardFoot}>
                      <span>Preview</span>
                      <span className={styles.arrow} aria-hidden>
                        <svg viewBox="0 0 20 20">
                          <path d="M5 15 15 5M8 5h7v7" />
                        </svg>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {preview ? (
        <>
          <button
            type="button"
            className={styles.drawerBackdrop}
            aria-label="Close preview"
            onClick={() => setPreview(null)}
          />
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
          >
            <div className={styles.drawerTop}>
              <div>
                <p className={styles.eyebrow}>
                  {preview.number} · {preview.category}
                </p>
                <h3 id={drawerTitleId}>{preview.title}</h3>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => setPreview(null)}
              >
                ×
              </button>
            </div>
            <p className={styles.preview}>{preview.preview}</p>
            <p className={styles.eyebrow} style={{ marginTop: "1.25rem" }}>
              You’ll practice moments like
            </p>
            <ul className={styles.examples}>
              {preview.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
            <div className={styles.drawerActions}>
              <form action={action}>
                <HiddenPrefs
                  displayName={displayName}
                  purposeStatement={preview.purposeStatement}
                  seasonLabel={preview.seasonLabel}
                  next={
                    "/app/practice?start=1&title=" +
                    encodeURIComponent(preview.purposeStatement)
                  }
                />
                <PendingSubmit
                  className={styles.primaryPath}
                  label={`Train on ${preview.title.replace(" Machine", "")}`}
                  pendingLabel="Starting…"
                />
              </form>
              <button
                type="button"
                className={styles.secondaryPath}
                onClick={() => setPreview(null)}
              >
                Keep exploring
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
