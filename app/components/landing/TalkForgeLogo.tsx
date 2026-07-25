type TalkForgeLogoProps = {
  className?: string;
  variant?: "full" | "mark";
};

function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.28"
      />
      <path
        d="M24 10c5.6 4.2 8.6 9 8.6 14.8 0 6.1-3.6 11-8.6 14.4-5-3.4-8.6-8.3-8.6-14.4C15.4 19 18.4 14.2 24 10z"
        fill="currentColor"
      />
      <path
        d="M24 18.2c2.4 2 3.7 4.1 3.7 6.8 0 2.9-1.6 5.3-3.7 7-2.1-1.7-3.7-4.1-3.7-7 0-2.7 1.3-4.8 3.7-6.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.5"
      />
    </svg>
  );
}

/** Official TalkForge logo mark + wordmark. */
export default function TalkForgeLogo({
  className = "",
  variant = "full",
}: TalkForgeLogoProps) {
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
