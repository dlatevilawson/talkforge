export function evaluateBlockCompletion(statuses: string[]): {
  completedDays: number;
  totalDays: number;
  blockComplete: boolean;
} {
  const completedDays = statuses.filter((status) => status === "done").length;
  return {
    completedDays,
    totalDays: statuses.length,
    blockComplete: statuses.length > 0 && completedDays === statuses.length,
  };
}

export function nextBlockStartDate(endsOn: string): string {
  const date = new Date(`${endsOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
