export type UtcCalendarMonthBounds = {
  startInclusive: string;
  endExclusive: string;
};

export function utcCalendarMonthBounds(
  now: Date = new Date()
): UtcCalendarMonthBounds {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return {
    startInclusive: start.toISOString(),
    endExclusive: end.toISOString(),
  };
}

export function isCompletedInUtcCalendarMonth(
  completedAt: string | null,
  now: Date
): boolean {
  if (!completedAt) return false;
  const timestamp = new Date(completedAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const bounds = utcCalendarMonthBounds(now);
  return (
    timestamp >= new Date(bounds.startInclusive).getTime() &&
    timestamp < new Date(bounds.endExclusive).getTime()
  );
}
