export const DAILY_MINUTE_OPTIONS = [5, 10, 15] as const;
export type DailyMinutes = (typeof DAILY_MINUTE_OPTIONS)[number];

/** Invalid submitted values fall back to the product's five-minute default. */
export function normalizeDailyMinutes(value: unknown): DailyMinutes {
  const parsed = typeof value === "number" ? value : Number(value);
  return DAILY_MINUTE_OPTIONS.includes(parsed as DailyMinutes)
    ? (parsed as DailyMinutes)
    : 5;
}

/** Blank means the member deliberately skipped this optional setting. */
export function parseOptionalDailyMinutes(value: unknown): DailyMinutes | null {
  if (value == null || String(value).trim() === "") return null;
  return normalizeDailyMinutes(value);
}

export function initialTrainingPlanRow(input: {
  memberId: string;
  kind: "6_week" | "6_month";
  startsOn: string;
  endsOn: string;
  occasionText?: string;
  occasionDate?: string;
  dailyMinutes?: number | null;
}) {
  return {
    member_id: input.memberId,
    kind: input.kind,
    occasion_text: (input.occasionText ?? "").trim().slice(0, 240),
    occasion_date: input.occasionDate || null,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    current_block_number: 1,
    status: "active" as const,
    daily_minutes: input.dailyMinutes === null || input.dailyMinutes === undefined ? null : parseOptionalDailyMinutes(input.dailyMinutes),
  };
}
