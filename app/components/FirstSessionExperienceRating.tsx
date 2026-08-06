"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FIRST_SESSION_RATING_SUBTITLE,
  FIRST_SESSION_RATING_TITLE,
  FIRST_SESSION_THANK_YOU,
  followUpBandForStars,
  followUpOptionsForBand,
  followUpPromptForBand,
  markFirstSessionRatingDoneLocally,
} from "@/lib/first-session-feedback";
import styles from "./FirstSessionExperienceRating.module.css";

type Step = "rate" | "thanks";

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export default function FirstSessionExperienceRating({
  sessionId,
  open,
  onClose,
}: Props) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("rate");
  const [stars, setStars] = useState(0);
  const [pending, setPending] = useState(false);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const band = stars > 0 ? followUpBandForStars(stars) : null;
  const options = band ? followUpOptionsForBand(band) : [];
  const followPrompt = band ? followUpPromptForBand(band) : "";

  function finishLocally() {
    markFirstSessionRatingDoneLocally();
    onClose();
  }

  async function submitRating(followUp: string) {
    if (!stars || pending) return;
    setPending(true);
    try {
      await fetch("/api/first-session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          starRating: stars,
          followUp,
        }),
      });
    } catch {
      // Still close thoughtfully — local once-flag prevents re-prompt spam.
    } finally {
      markFirstSessionRatingDoneLocally();
      setPending(false);
      setStep("thanks");
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
      autoCloseRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    }
  }

  async function dismiss() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/first-session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          dismissed: true,
        }),
      });
    } catch {
      // Local flag still ends the prompt for this device.
    } finally {
      setPending(false);
      finishLocally();
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && step === "rate") {
          void dismiss();
        }
      }}
    >
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.handle} aria-hidden="true" />

        {step === "thanks" ? (
          <div className={styles.thanks}>
            <h2 id={titleId} className={styles.thanksTitle}>
              Thank you.
            </h2>
            <p className={styles.thanksBody}>{FIRST_SESSION_THANK_YOU}</p>
            <button
              type="button"
              className={styles.done}
              onClick={() => {
                if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
                onClose();
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 id={titleId} className={styles.title}>
              {FIRST_SESSION_RATING_TITLE}
            </h2>
            <p className={styles.subtitle}>{FIRST_SESSION_RATING_SUBTITLE}</p>

            <div
              className={styles.stars}
              role="radiogroup"
              aria-label="Star rating"
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= stars;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={stars === value}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    className={`${styles.star} ${active ? styles.starActive : ""}`}
                    disabled={pending}
                    onClick={() => setStars(value)}
                  >
                    ★
                  </button>
                );
              })}
            </div>

            {band ? (
              <div className={styles.followUp}>
                <p className={styles.followPrompt}>{followPrompt}</p>
                <div className={styles.options} role="list">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="listitem"
                      className={styles.option}
                      disabled={pending}
                      onClick={() => void submitRating(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className={styles.skip}
              disabled={pending}
              onClick={() => void dismiss()}
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
