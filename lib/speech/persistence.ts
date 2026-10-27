import { getSupabaseClient } from "@/lib/supabase/client";
import type { TranscriptTurn } from "@/lib/ce/transcript";

export type SpeechCapture = {
  audioBlob: Blob | null;
  turns: TranscriptTurn[];
};

/** Persist only observed speech evidence. Missing telemetry stays null. */
export async function persistSpeechCapture(input: {
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  fillerCount: number | null;
  capture: SpeechCapture;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  let audioPath: string | null = null;
  if (input.capture.audioBlob) {
    const mimeType = input.capture.audioBlob.type || "audio/webm";
    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    const storagePath = `${input.userId}/${input.sessionId}.${ext}`;
    audioPath = storagePath;
    const upload = await supabase.storage.from("speech-audio").upload(
      storagePath,
      input.capture.audioBlob,
      { contentType: mimeType, upsert: false }
    );
    if (upload.error) throw new Error(`Failed to persist speech audio: ${upload.error.message}`);

    const { error: audioError } = await supabase.from("speech_audio").upsert({
      session_id: input.sessionId,
      user_id: input.userId,
      storage_path: storagePath,
      mime_type: mimeType,
      duration_seconds: input.durationSeconds,
    });
    if (audioError) throw new Error(`Failed to persist speech audio metadata: ${audioError.message}`);
  }

  const turns = input.capture.turns.map((turn) => ({
    session_id: input.sessionId,
    user_id: input.userId,
    turn_index: turn.turnIndex,
    role: turn.role === "founder" ? "member" : "counterpart",
    start_offset_ms: turn.startOffsetMs ?? null,
    end_offset_ms: turn.endOffsetMs ?? null,
    timing_source: turn.timingSource ?? "not_measured",
  }));
  if (turns.length) {
    const { error } = await supabase.from("speech_turns").upsert(turns, {
      onConflict: "session_id,turn_index",
    });
    if (error) throw new Error(`Failed to persist speech turns: ${error.message}`);
  }

  const words = input.capture.turns.flatMap((turn) =>
    (turn.words ?? []).map((word) => ({
      session_id: input.sessionId,
      user_id: input.userId,
      word: word.word,
      start_offset_ms: word.startOffsetMs,
      end_offset_ms: word.endOffsetMs,
      timing_source: "transcription",
    }))
  );
  if (words.length) {
    const { error } = await supabase.from("speech_words").insert(words);
    if (error) throw new Error(`Failed to persist speech words: ${error.message}`);
  }

  const { error: metricError } = await supabase.from("speech_metrics").upsert({
    session_id: input.sessionId,
    user_id: input.userId,
    filler_count: input.fillerCount,
    // Pace, pauses, and talk-time require telemetry not available in legacy reports.
    filler_density_per_100_words: null,
    pace_wpm: null,
    pause_count: null,
    pause_total_ms: null,
    longest_pause_ms: null,
    member_talk_time_pct: null,
    member_speaking_time_ms: null,
    measured_at: null,
  });
  if (metricError) throw new Error(`Failed to persist speech metrics: ${metricError.message}`);

  const fillerPattern = /^(?:um+|uh+|like|you know|basically|actually|literally)$/i;
  const fillers = input.capture.turns.flatMap((turn) =>
    (turn.words ?? []).filter((word) => fillerPattern.test(word.word.trim())).map((word, index) => ({
      session_id: input.sessionId,
      user_id: input.userId,
      word: word.word.trim().toLowerCase(),
      occurrence_index: index,
      start_offset_ms: word.startOffsetMs,
      end_offset_ms: word.endOffsetMs,
      replay_ref_id: null,
    }))
  );
  if (fillers.length) {
    let fillerRows = fillers;
    if (audioPath) {
      const refs = fillers.map((filler) => ({
        session_id: input.sessionId,
        user_id: input.userId,
        audio_path: audioPath,
        start_offset_ms: filler.start_offset_ms,
        end_offset_ms: filler.end_offset_ms,
      }));
      const { data: replayRefs, error: replayError } = await supabase
        .from("speech_replay_refs")
        .insert(refs)
        .select("id");
      if (replayError) throw new Error(`Failed to persist replay references: ${replayError.message}`);
      fillerRows = fillers.map((filler, index) => ({
        ...filler,
        replay_ref_id: replayRefs?.[index]?.id ?? null,
      }));
    }
    const { error } = await supabase.from("speech_filler_moments").insert(fillerRows);
    if (error) throw new Error(`Failed to persist filler moments: ${error.message}`);
  }
}
