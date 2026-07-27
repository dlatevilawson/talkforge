type TalkForgeLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "hero" | "finale" | "lockup";
  showTagline?: boolean;
};

/** Brand-sheet mark — peak / forge base / facing profiles in negative space. */
function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M50 0L90 92H76L70 118H30L24 92H10L50 0ZM50 26C44 30 41 35 40 42C39.2 46 37 48.5 37.5 52C38 55 40.5 55.5 41.2 58.5C41.8 61 40.5 63.5 42.5 66.5C44.5 69.5 47 70 50 74C53 70 55.5 69.5 57.5 66.5C59.5 63.5 58.2 61 58.8 58.5C59.5 55.5 62 55 62.5 52C63 48.5 60.8 46 60 42C59 35 56 30 50 26Z"
      />
    </svg>
  );
}

/** Wordmark TALKFORGE — custom A (no crossbar) + notched G */
function Wordmark({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <g fill="currentColor">
        <path d="M0 2h26v3.6H14.6V22H11.4V5.6H0V2z" />
        <path d="M48.5 22h-3.8l-1.3-4H35.2l-1.3 4h-3.7L38 2h4l6.5 20zM36.6 14.6h6.6L40 5.4l-3.4 9.2z" />
        <path d="M58 2h3.2v16H72V22H58V2z" />
        <path d="M80 2h3.2v8.8L93.4 2H97.6L88.2 11.2 98 22h-4.2l-9.4-12.2V22H80V2z" />
        <path d="M110 2h18.5v3.6h-15.3v6H126V15h-13V22H110V2z" />
        <path d="M144 12c0-6.8 4.6-11.4 11.2-11.4S166.4 5.2 166.4 12s-4.6 11.4-11.2 11.4S144 18.8 144 12zm3.4 0c0 4.8 3.1 7.8 7.8 7.8s7.8-3 7.8-7.8-3.1-7.8-7.8-7.8-7.8 3-7.8 7.8z" />
        <path d="M176 2h11.4c4.6 0 7.8 2.6 7.8 6.8 0 3.5-2 5.9-5.4 6.8L198 22h-4l-6.2-8H179.2V22H176V2zm3.2 3.6v7h8c2.6 0 4.4-1.3 4.4-3.5s-1.8-3.5-4.4-3.5h-8z" />
        <path d="M208 12c0-6.8 4.7-11.4 11.4-11.4 4.6 0 8.1 2 10.1 5.3l-2.8 2c-1.5-2.4-3.9-3.7-7.3-3.7-4.8 0-8.1 3-8.1 7.8s3.3 7.8 8.1 7.8c3.1 0 5.5-1.1 7-2.9v-3h-6.8v-3.4h10.2v5.2c-2 3.9-5.9 6.9-10.6 6.9-6.6 0-11.2-4.6-11.2-11.4zm16.2 9h2.4v2.8h-4l1.6-2.8z" />
        <path d="M238 2h18.5v3.6h-15.3v5.8h13.6v3.4h-13.6V22H238V2z" />
      </g>
    </svg>
  );
}

export default function TalkForgeLogo({
  className = "",
  variant = "full",
  showTagline = false,
}: TalkForgeLogoProps) {
  if (variant === "hero" || variant === "finale") {
    return (
      <span
        className={`inline-flex flex-col items-center gap-5 text-current ${className}`}
        aria-label="TalkForge"
      >
        <span className="lp-mark-breathe relative inline-flex">
          <span className="lp-mark-glow" aria-hidden />
          <Mark
            className={
              variant === "finale" ? "h-20 w-auto sm:h-24" : "h-16 w-auto sm:h-20"
            }
          />
        </span>
        <Wordmark className="h-3.5 w-auto sm:h-4" />
      </span>
    );
  }

  if (variant === "mark") {
    return (
      <span className={`inline-flex text-current ${className}`} aria-label="TalkForge">
        <Mark className="h-9 w-auto" />
      </span>
    );
  }

  if (variant === "lockup") {
    return (
      <span
        className={`inline-flex flex-col items-center gap-3 text-current ${className}`}
        aria-label="TalkForge — Practice. Connect. Transform."
      >
        <Mark className="h-16 w-auto sm:h-20" />
        <Wordmark className="h-3.5 w-auto sm:h-4" />
        {showTagline && (
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-current opacity-70">
            Practice. Connect. Transform.
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 text-current ${className}`}
      aria-label="TalkForge"
    >
      <Mark className="h-8 w-auto" />
      <Wordmark className="h-3 w-auto translate-y-[1px]" />
    </span>
  );
}
