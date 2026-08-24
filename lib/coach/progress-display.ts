/**
 * Progress display rules. Does not change session scoring or Forge inputs.
 */

/** Two completed sessions — enough history that a combined number is not one-rep theater. */
export const OVERALL_MIN_SESSIONS = 2;

export function shouldShowOverall(sessionsCompleted: number): boolean {
  return Number.isFinite(sessionsCompleted) && sessionsCompleted >= OVERALL_MIN_SESSIONS;
}
