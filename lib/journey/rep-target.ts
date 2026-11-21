export function resolveRepTarget(memberTarget: string | null | undefined, coachAdjustment: string | null | undefined): string | null {
  const target = memberTarget?.trim() || coachAdjustment?.trim();
  return target || null;
}

export function repeatDrillHref(input: { drillSlug: string; target: string; programId?: string; dayId?: string }): string {
  const query = new URLSearchParams({ drill: input.drillSlug, start: "1", target: input.target });
  if (input.programId && input.dayId) {
    query.set("programId", input.programId);
    query.set("repeat", "1");
    query.set("repeatDayId", input.dayId);
  }
  return `/app/practice?${query.toString()}`;
}

export function completionDayWrite(input: { repeat: boolean; dayId: string | null }): { dayId: string | null; markDayDone: boolean } {
  return { dayId: input.dayId, markDayDone: Boolean(input.dayId) && !input.repeat };
}
