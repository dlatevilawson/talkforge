export type WakeLockReleaseListener = {
  addEventListener: (
    type: "release",
    listener: () => void,
    options?: { once?: boolean }
  ) => void;
};

/** Register the one-shot release hook needed to invalidate stale sentinels. */
export function attachWakeLockReleaseListener(
  lock: WakeLockReleaseListener,
  onRelease: () => void
): void {
  lock.addEventListener("release", onRelease, { once: true });
}
