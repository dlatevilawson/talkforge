"use client";

import { useId } from "react";

/**
 * Official TalkForge logo — Founder-authored symbol (Decision 032).
 * Mark: twin forms meeting through a center opening.
 * Color: Founder gold gradient retained; wordmark uses LP ink.
 */
type TalkForgeLogoProps = {
  className?: string;
  variant?: "full" | "mark";
};

const GOLD_STOPS = [
  { offset: "0%", color: "#F7E3B0" },
  { offset: "30%", color: "#E8C173" },
  { offset: "55%", color: "#C99B4A" },
  { offset: "78%", color: "#EBC77E" },
  { offset: "100%", color: "#B98634" },
] as const;

function Mark({
  className = "h-8 w-8",
  gradId,
  maskId,
}: {
  className?: string;
  gradId: string;
  maskId: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="200 40 400 580"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          {GOLD_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <mask id={maskId}>
          <rect x="200" y="40" width="400" height="580" fill="#fff" />
          <circle cx="400" cy="330" r="38" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill={`url(#${gradId})`}>
        <path d="M394 56 C 386 180 328 276 240 328 C 328 382 386 478 394 604 Z" />
        <path d="M406 56 C 414 180 472 276 560 328 C 472 382 414 478 406 604 Z" />
      </g>
    </svg>
  );
}

/** Official TalkForge logo mark + wordmark. */
export default function TalkForgeLogo({
  className = "",
  variant = "full",
}: TalkForgeLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `tfGold-${uid}`;
  const maskId = `tfHole-${uid}`;

  if (variant === "mark") {
    return (
      <span className={`inline-flex ${className}`} aria-label="TalkForge">
        <Mark className="h-10 w-7" gradId={gradId} maskId={maskId} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="TalkForge"
    >
      <Mark className="h-9 w-6" gradId={gradId} maskId={maskId} />
      <span className="font-[family-name:var(--font-lp-sans),ui-sans-serif,system-ui,sans-serif] text-[1.05rem] font-medium uppercase tracking-[0.18em] text-[var(--lp-ink)]">
        TalkForge
      </span>
    </span>
  );
}
