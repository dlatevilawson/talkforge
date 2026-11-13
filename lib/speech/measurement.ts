/** Pure, observed-only speech measurements from timestamped words. */
export const PAUSE_THRESHOLD_MS = 2000;

export type MeasuredWord = {
  word: string;
  startOffsetMs: number;
  endOffsetMs: number;
};

export type SpeechMeasurements = {
  fillerCount: number;
  fillerDensityPer100Words: number;
  paceWpm: number;
  pauseCount: number;
  pauseTotalMs: number;
  longestPauseMs: number;
  memberTalkTimePct: number;
  memberSpeakingTimeMs: number;
  pauses: Array<{ startOffsetMs: number; endOffsetMs: number; durationMs: number }>;
  fillers: Array<{ word: string; occurrenceIndex: number; startOffsetMs: number; endOffsetMs: number }>;
};

const FILLER_WORDS = new Set(["um", "uh", "like", "basically", "actually", "literally"]);

export function measureTimestampedSpeech(
  words: MeasuredWord[],
  audioDurationMs: number,
  memberSpeakingTimeMs = audioDurationMs
): SpeechMeasurements | null {
  if (!words.length || !Number.isFinite(audioDurationMs) || audioDurationMs <= 0) return null;
  const ordered = [...words].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
  const first = ordered[0].startOffsetMs;
  const last = ordered[ordered.length - 1].endOffsetMs;
  const speakingMs = Math.max(1, Math.min(audioDurationMs, memberSpeakingTimeMs));
  const fillers = ordered
    .filter((word) => FILLER_WORDS.has(word.word.trim().toLowerCase()))
    .map((word, index) => ({
      word: word.word.trim().toLowerCase(),
      occurrenceIndex: index,
      startOffsetMs: word.startOffsetMs,
      endOffsetMs: word.endOffsetMs,
    }));
  const pauses = ordered.slice(1).flatMap((word, index) => {
    const previous = ordered[index];
    const gap = word.startOffsetMs - previous.endOffsetMs;
    return gap >= PAUSE_THRESHOLD_MS
      ? [{ startOffsetMs: previous.endOffsetMs, endOffsetMs: word.startOffsetMs, durationMs: gap }]
      : [];
  });
  return {
    fillerCount: fillers.length,
    fillerDensityPer100Words: Number(((fillers.length / ordered.length) * 100).toFixed(3)),
    paceWpm: Number(((ordered.length / (speakingMs / 60000))).toFixed(2)),
    pauseCount: pauses.length,
    pauseTotalMs: pauses.reduce((sum, pause) => sum + pause.durationMs, 0),
    longestPauseMs: pauses.reduce((max, pause) => Math.max(max, pause.durationMs), 0),
    memberTalkTimePct: Number(((speakingMs / audioDurationMs) * 100).toFixed(3)),
    memberSpeakingTimeMs: speakingMs,
    pauses,
    fillers,
  };
}
