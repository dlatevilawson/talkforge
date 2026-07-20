/**
 * CE-M2 transcript persistence (localStorage).
 * Available for CE-M3 coaching handoff via getCoachHistoryForVoiceSession.
 */

import {
  summarizeTranscript,
  toCoachHistory,
  type CoachHistoryItem,
  type TranscriptTurn,
} from "./transcript";

const STORE_KEY = "talkforge.ce_transcripts.v1";
const ACTIVE_KEY = "talkforge.ce_active_voice_session.v1";

export type VoiceTranscriptRecord = {
  voiceSessionId: string;
  realtimeSessionId?: string | null;
  track?: string;
  eventTitle?: string;
  createdAt: string;
  updatedAt: string;
  turns: TranscriptTurn[];
  /** Ready for CE-M3 /api/coach history */
  coachHistory: CoachHistoryItem[];
  summary: {
    founderTurns: number;
    forgeTurns: number;
    ordered: boolean;
  };
};

type StoreShape = {
  records: VoiceTranscriptRecord[];
};

function readStore(): StoreShape {
  if (typeof window === "undefined") return { records: [] };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { records: [] };
    const parsed = JSON.parse(raw) as StoreShape;
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    return { records: [] };
  }
}

function writeStore(store: StoreShape): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function createVoiceSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `voice_${crypto.randomUUID()}`;
  }
  return `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function setActiveVoiceSessionId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (!id) {
    window.localStorage.removeItem(ACTIVE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveVoiceSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function saveVoiceTranscript(
  partial: Omit<VoiceTranscriptRecord, "coachHistory" | "summary" | "updatedAt"> & {
    updatedAt?: string;
  }
): VoiceTranscriptRecord {
  const summary = summarizeTranscript(partial.turns);
  const record: VoiceTranscriptRecord = {
    voiceSessionId: partial.voiceSessionId,
    realtimeSessionId: partial.realtimeSessionId,
    track: partial.track,
    eventTitle: partial.eventTitle,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    turns: partial.turns,
    coachHistory: toCoachHistory(partial.turns),
    summary,
  };

  const store = readStore();
  const next = [
    record,
    ...store.records.filter((r) => r.voiceSessionId !== record.voiceSessionId),
  ].slice(0, 40);
  writeStore({ records: next });
  return record;
}

export function getVoiceTranscript(
  voiceSessionId: string
): VoiceTranscriptRecord | null {
  return (
    readStore().records.find((r) => r.voiceSessionId === voiceSessionId) ??
    null
  );
}

export function listVoiceTranscripts(): VoiceTranscriptRecord[] {
  return readStore().records;
}

/** CE-M3 handoff: coach-shaped history for a voice session. */
export function getCoachHistoryForVoiceSession(
  voiceSessionId: string
): CoachHistoryItem[] {
  return getVoiceTranscript(voiceSessionId)?.coachHistory ?? [];
}
