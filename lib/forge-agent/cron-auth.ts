export function authorizeForgeAgentCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export function forgeAgentCronHttpStatus(
  status: "completed" | "partial" | "failed"
): number {
  return status === "failed" ? 500 : 200;
}

export function isUsableCronTick(
  tick: Record<string, unknown> | null
): tick is Record<string, unknown> & { id: string } {
  return typeof tick?.id === "string" && tick.id.length > 0;
}
