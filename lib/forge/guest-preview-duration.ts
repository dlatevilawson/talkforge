export const GUEST_FORGE_MAX_DURATION_SECONDS = 15 * 60;
export const GUEST_FORGE_DEFAULT_DURATION_SECONDS = 5 * 60;
export const GUEST_FORGE_MIN_DURATION_SECONDS = 60;

/** Client defense-in-depth: never accept a server value above 15 minutes. */
export function clampGuestPreviewDurationSeconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return GUEST_FORGE_DEFAULT_DURATION_SECONDS;
  }
  return Math.min(
    GUEST_FORGE_MAX_DURATION_SECONDS,
    Math.max(GUEST_FORGE_MIN_DURATION_SECONDS, Math.floor(value))
  );
}

export function formatGuestPreviewCountdown(seconds: number): string {
  const bounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(bounded / 60);
  const remainder = bounded % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
