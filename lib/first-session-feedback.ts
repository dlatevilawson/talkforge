/** First-session check-in — IV-UX-010. Not a survey. Mission-aligned. */

export const FIRST_SESSION_RATING_STORAGE_KEY = "tf_first_session_rating_done";

/** Mission question — measures coach quality, not app liking. */
export const FIRST_SESSION_RATING_TITLE =
  "Did this feel like practicing with a real communication coach?";

export const FIRST_SESSION_RATING_SUBTITLE =
  "One thoughtful answer helps Forge get better.";

export const FIRST_SESSION_THANKS_TITLE =
  "Thanks for helping us build the world’s best communication coach.";

export const FIRST_SESSION_THANK_YOU =
  "Every conversation helps Forge become a better coach. Thanks for being one of our first members.";

export const FIRST_SESSION_OPTIONAL_PROMPT =
  "Anything you’d like us to know? (optional)";

export const FIRST_SESSION_OPTIONAL_MAX = 500;

export type FirstSessionFollowUpBand = "high" | "mid" | "low";

export type FirstSessionFollowUpOption = {
  id: string;
  label: string;
};

const HIGH_OPTIONS: FirstSessionFollowUpOption[] = [
  { id: "understood", label: "Forge really understood me" },
  { id: "realistic", label: "The practice felt realistic" },
  { id: "useful", label: "I learned something useful" },
  { id: "easier", label: "It was easier than I expected" },
  { id: "other_high", label: "Other" },
];

const MID_OPTIONS: FirstSessionFollowUpOption[] = [
  { id: "better_coaching", label: "Better coaching" },
  { id: "better_voice", label: "Better voice experience" },
  { id: "more_realistic", label: "More realistic conversations" },
  { id: "clearer_guidance", label: "Clearer guidance" },
  { id: "other_mid", label: "Something else" },
];

const LOW_OPTIONS: FirstSessionFollowUpOption[] = [
  { id: "not_understood", label: "Forge didn’t understand me" },
  { id: "unnatural", label: "The conversation felt unnatural" },
  { id: "technical", label: "Technical issues" },
  { id: "unsure", label: "I wasn’t sure what to do" },
  { id: "other_low", label: "Something else" },
];

export function followUpBandForStars(
  stars: number
): FirstSessionFollowUpBand | null {
  if (stars >= 4) return "high";
  if (stars === 3) return "mid";
  if (stars >= 1 && stars <= 2) return "low";
  return null;
}

export function followUpPromptForBand(band: FirstSessionFollowUpBand): string {
  if (band === "high") return "What stood out the most?";
  if (band === "mid") return "What could we improve?";
  return "We’re listening. What frustrated you most?";
}

export function followUpOptionsForBand(
  band: FirstSessionFollowUpBand
): FirstSessionFollowUpOption[] {
  if (band === "high") return HIGH_OPTIONS;
  if (band === "mid") return MID_OPTIONS;
  return LOW_OPTIONS;
}

export function isValidFollowUpForStars(
  stars: number,
  followUpId: string
): boolean {
  const band = followUpBandForStars(stars);
  if (!band) return false;
  return followUpOptionsForBand(band).some((option) => option.id === followUpId);
}

export function normalizeOptionalComment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, FIRST_SESSION_OPTIONAL_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

export function markFirstSessionRatingDoneLocally(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_SESSION_RATING_STORAGE_KEY, "1");
  } catch {
    // Private mode / blocked storage — server unique constraint remains authority.
  }
}

export function hasLocalFirstSessionRatingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FIRST_SESSION_RATING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Fire-and-forget: update internal return / next-session signals. */
export function reportFirstSessionReturnSignal(
  kind: "home_visit" | "session_started" = "home_visit"
): void {
  if (typeof window === "undefined") return;
  void fetch("/api/first-session-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "signal", kind }),
    keepalive: true,
  }).catch(() => {
    // Internal metrics only — never block the member.
  });
}
