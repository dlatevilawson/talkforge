"use client";

import styles from "./PresenceRing.module.css";

export type PresenceRingState =
  | "idle"
  | "connecting"
  | "listening"
  | "forge_speaking"
  | "wrap";

type Props = {
  state: PresenceRingState;
  /** 0–1 mic energy for ripple amplitude while listening. */
  level?: number;
  label?: string;
};

/**
 * Luxury Arena centerpiece — obsidian/gold ambient presence ring.
 */
export default function PresenceRing({
  state,
  level = 0,
  label,
}: Props) {
  const ripple = Math.max(0, Math.min(1, level));
  return (
    <div
      className={`${styles.shell} ${styles[`state_${state}`]}`}
      style={{ ["--level" as string]: String(ripple) }}
      aria-live="polite"
      aria-label={label || state}
    >
      <div className={styles.halo} aria-hidden />
      <div className={styles.ripple} aria-hidden />
      <div className={styles.rippleDelay} aria-hidden />
      <svg
        className={styles.ring}
        viewBox="0 0 200 200"
        role="img"
        aria-hidden={!label}
      >
        <defs>
          <linearGradient id="arena-ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a7340" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f0d78a" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="arena-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1a1712" />
            <stop offset="70%" stopColor="#0D0D0E" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="78" fill="url(#arena-core)" />
        <circle
          className={styles.track}
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="rgba(212,175,55,0.12)"
          strokeWidth="1.25"
        />
        <circle
          className={styles.pulse}
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="url(#arena-ring-gold)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
