import {
  FORGE_AGENT_DRAFT_SYSTEM,
  FORGE_AGENT_MAX_INPUT_TOKENS,
  type ForgeCueKind,
} from "./types.ts";

const MAX_BODY_CHARS = 400;
const URL_PATTERN = /https?:\/\/|www\.|\/app\//i;
const LIST_PATTERN = /(?:^|[;]\s*)(?:[-*•]|\d+[.)])\s+\S/;

/**
 * Conservative token upper bound for gpt-4o-mini (o200k_base) and cl100k_base.
 * Those BPEs encode UTF-8 bytes and never emit more than one token per byte.
 * Character-length / 4 undercounts CJK and other non-ASCII text.
 */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function measureInputTokenUpperBound(...parts: string[]): number {
  return parts.reduce((sum, part) => sum + utf8ByteLength(part), 0);
}

export function truncateToUtf8Bytes(text: string, maxBytes: number): string {
  if (maxBytes <= 0) return "";
  if (utf8ByteLength(text) <= maxBytes) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (utf8ByteLength(text.slice(0, mid)) <= maxBytes) low = mid;
    else high = mid - 1;
  }
  return text.slice(0, low);
}

export function isOneNextMoveSentence(body: string): boolean {
  if (!body || body.includes("\n")) return false;
  if (LIST_PATTERN.test(body)) return false;
  const endings = body.match(/[.!?]/g) ?? [];
  if (endings.length > 1) return false;
  if (endings.length === 1 && !/[.!?]$/.test(body)) return false;
  return true;
}

export function sanitizeDraftBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.trim().replace(/\s+/g, " ");
  if (!body) return null;
  if (body.length > MAX_BODY_CHARS) return null;
  if (URL_PATTERN.test(body)) return null;
  if (!isOneNextMoveSentence(body)) return null;
  return body;
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

export function attemptMatchesAction(
  detail: unknown,
  actionId: string,
  cueId: string
): boolean {
  if (!detail || typeof detail !== "object") return false;
  const record = detail as Record<string, unknown>;
  return record.action_id === actionId || record.cue_id === cueId;
}

export function buildDraftUserPrompt(input: {
  kind: ForgeCueKind;
  title: string;
  successCriteria?: string | null;
  contextText?: string;
}): string {
  const withoutContext = [
    "Write one next move for an in-app coaching check-in.",
    "Return JSON only: {\"body\":\"...\"}.",
    "No URLs. No advice list. One short sentence.",
    `Declared kind: ${input.kind}`,
    `Declared title: ${input.title}`,
    input.successCriteria
      ? `Declared success: ${input.successCriteria}`
      : "Declared success: (none)",
  ].join("\n");

  const contextText = input.contextText?.trim() ?? "";
  if (!contextText) return withoutContext;

  const withContext = `${withoutContext}\nApproved context:\n${contextText}`;
  if (
    measureInputTokenUpperBound(FORGE_AGENT_DRAFT_SYSTEM, withContext) <=
    FORGE_AGENT_MAX_INPUT_TOKENS
  ) {
    return withContext;
  }
  return withoutContext;
}

export function sanitizeAttemptDetail(input: {
  action_id?: unknown;
  cue_id?: unknown;
  cron_run_id?: unknown;
  errorCode?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
}): Record<string, unknown> {
  const detail: Record<string, unknown> = {};
  if (typeof input.action_id === "string" && input.action_id) {
    detail.action_id = input.action_id;
  }
  if (typeof input.cue_id === "string" && input.cue_id) {
    detail.cue_id = input.cue_id;
  }
  if (typeof input.cron_run_id === "string" && input.cron_run_id) {
    detail.cron_run_id = input.cron_run_id;
  }
  if (typeof input.errorCode === "string" && input.errorCode) {
    detail.errorCode = input.errorCode;
  }
  if (typeof input.inputTokens === "number" && Number.isFinite(input.inputTokens)) {
    detail.inputTokens = input.inputTokens;
  }
  if (
    typeof input.outputTokens === "number" &&
    Number.isFinite(input.outputTokens)
  ) {
    detail.outputTokens = input.outputTokens;
  }
  return detail;
}
