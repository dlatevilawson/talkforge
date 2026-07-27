type TalkForgeLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "hero" | "finale";
};

/** Official TalkForge mark — Brand Directive v2 upward silhouette. */
function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M32 4c10.5 8.2 17 17.6 17 29.2 0 13.4-7.2 23.6-17 30.8C22.2 56.8 15 46.6 15 33.2 15 21.6 21.5 12.2 32 4zm0 14c-4.8 3.6-7.4 7.8-7.4 13.2 0 5.8 3.1 10.6 7.4 14.2 4.3-3.6 7.4-8.4 7.4-14.2 0-5.4-2.6-9.6-7.4-13.2z"
      />
    </svg>
  );
}

export default function TalkForgeLogo({
  className = "",
  variant = "full",
}: TalkForgeLogoProps) {
  if (variant === "hero" || variant === "finale") {
    return (
      <span
        className={`lp-mark-breathe relative inline-flex text-current ${className}`}
        aria-label="TalkForge"
      >
        <span className="lp-mark-glow" aria-hidden />
        <Mark className={variant === "finale" ? "h-16 w-16 sm:h-20 sm:w-20" : "h-14 w-14 sm:h-16 sm:w-16"} />
      </span>
    );
  }

  if (variant === "mark") {
    return (
      <span className={`inline-flex text-current ${className}`} aria-label="TalkForge">
        <Mark className="h-9 w-9" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 text-current ${className}`}
      aria-label="TalkForge"
    >
      <Mark className="h-8 w-8" />
      <span className="font-[family-name:var(--font-lp-display),ui-serif,Georgia,serif] text-[1.35rem] font-semibold tracking-[-0.03em]">
        TalkForge
      </span>
    </span>
  );
}
