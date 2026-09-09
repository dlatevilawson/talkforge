/**
 * Signed-in Forge mid-session resume after refresh or a dead peer reconnect.
 * Guest preview is one-shot and must not use this path.
 */

import type { TranscriptTurn } from "./transcript.ts";

export const PRACTICE_RESUME_WINDOW_MS = 2 * 60 * 60 * 1_000;
export const PRACTICE_RESUME_MAX_TURNS = 8;
export const PRACTICE_RESUME_MAX_TURN_CHARS = 400;

export function isPracticeResumeEligible(input: {
  turns: unknown[];
  updatedAt?: string;
  completedAt?: string | null;
  nowMs?: number;
  windowMs?: number;
}): boolean {
  if (input.completedAt) return false;
  if (!Array.isArray(input.turns) || input.turns.length === 0) return false;
  const updated = Date.parse(input.updatedAt ?? "");
  if (!Number.isFinite(updated)) return false;
  const now = input.nowMs ?? Date.now();
  return now - updated <= (input.windowMs ?? PRACTICE_RESUME_WINDOW_MS);
}

export function resumeMatchesArena(
  record: { track?: string; eventTitle?: string },
  input: { track?: string; eventTitle?: string }
): boolean {
  if (record.track && input.track && record.track !== input.track) {
    return false;
  }
  const saved = (record.eventTitle ?? "").trim();
  const next = (input.eventTitle ?? "").trim();
  if (saved && next && saved !== next) return false;
  return true;
}

export function buildResumeBrief(turns: TranscriptTurn[]): string {
  return turns
    .slice(-PRACTICE_RESUME_MAX_TURNS)
    .map((turn) => {
      const who = turn.role === "founder" ? "Member" : "Forge";
      const text = turn.text.trim().slice(0, PRACTICE_RESUME_MAX_TURN_CHARS);
      return `${who}: ${text}`;
    })
    .filter((line) => line.length > 8)
    .join("\n");
}

export function selectEligibleVoiceResume<
  T extends {
    turns: unknown[];
    updatedAt?: string;
    track?: string;
    eventTitle?: string;
  },
>(
  record: T | null | undefined,
  input: { track?: string; eventTitle?: string; nowMs?: number } = {}
): T | null {
  if (!record) return null;
  if (
    !isPracticeResumeEligible({
      turns: record.turns,
      updatedAt: record.updatedAt,
      nowMs: input.nowMs,
    })
  ) {
    return null;
  }
  if (!resumeMatchesArena(record, input)) return null;
  return record;
}

export function loadEligibleVoiceResume(input: {
  getActiveId: () => string | null;
  getRecord: (id: string) => {
    turns: unknown[];
    updatedAt?: string;
    track?: string;
    eventTitle?: string;
  } | null;
  track?: string;
  eventTitle?: string;
  nowMs?: number;
}) {
  const id = input.getActiveId();
  if (!id) return null;
  return selectEligibleVoiceResume(input.getRecord(id), {
    track: input.track,
    eventTitle: input.eventTitle,
    nowMs: input.nowMs,
  });
}
