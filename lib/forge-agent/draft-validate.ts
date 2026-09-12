const MAX_BODY_CHARS = 400;
const URL_PATTERN = /https?:\/\/|www\.|\/app\//i;

export function sanitizeDraftBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.trim().replace(/\s+/g, " ");
  if (!body) return null;
  if (body.length > MAX_BODY_CHARS) return null;
  if (URL_PATTERN.test(body)) return null;
  return body;
}

export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function isStaleDraftingTimestamp(
  updatedAt: string,
  now = new Date(),
  staleMs = 90_000
): boolean {
  const at = new Date(updatedAt);
  if (Number.isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() >= staleMs;
}
