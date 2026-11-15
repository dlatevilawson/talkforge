import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { measureTimestampedSpeech } from "@/lib/speech/measurement";

/**
 * Transcription is deliberately asynchronous. Audio and completion already
 * exist before this route runs; a provider failure must never undo either.
 * `whisper-1` is the current word-timestamp adapter. The model is env-selectable
 * so the provider can be changed after a cost/availability decision.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) {
    console.error("[speech] measurement skipped: OPENAI_API_KEY is not configured");
    return NextResponse.json({ error: "measurement_unavailable" }, { status: 503 });
  }
  if (process.env.OPENAI_SPEECH_ANALYSIS_ENABLED !== "true") {
    console.info("[speech] measurement disabled until transcription spend is approved");
    return NextResponse.json({ ok: true, measured: false, disabled: true }, { status: 202 });
  }

  const admin = createAdminSupabaseClient();
  const [{ data: audio, error: audioError }, { data: session, error: sessionError }] = await Promise.all([
    admin.from("speech_audio").select("storage_path,mime_type,duration_seconds,user_id").eq("session_id", sessionId).eq("user_id", user.id).maybeSingle(),
    admin.from("practice_sessions").select("id,duration_seconds,user_id").eq("id", sessionId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (audioError || sessionError) return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  if (!audio || !session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const downloaded = await admin.storage.from("speech-audio").download(audio.storage_path);
    if (downloaded.error || !downloaded.data) throw new Error(downloaded.error?.message ?? "audio_not_found");
    const file = new File([downloaded.data], "speech.webm", { type: audio.mime_type || "audio/webm" });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_SPEECH_TRANSCRIPTION_MODEL?.trim() || "whisper-1";
    const transcription = await client.audio.transcriptions.create({
      file,
      model,
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    } as never) as unknown as { words?: Array<{ word?: string; start?: number; end?: number; start_ms?: number; end_ms?: number }> };
    const words = (transcription.words ?? []).flatMap((word) => {
      const start = typeof word.start_ms === "number" ? word.start_ms : typeof word.start === "number" ? Math.round(word.start * 1000) : null;
      const end = typeof word.end_ms === "number" ? word.end_ms : typeof word.end === "number" ? Math.round(word.end * 1000) : null;
      return word.word && start != null && end != null && end >= start
        ? [{ word: word.word, startOffsetMs: start, endOffsetMs: end }]
        : [];
    });
    if (!words.length) {
      console.warn("[speech] transcription returned no word timings", { sessionId, model });
      return NextResponse.json({ ok: true, measured: false });
    }

    const durationMs = Math.max(1, Math.round((audio.duration_seconds ?? session.duration_seconds ?? 0) * 1000));
    const measurements = measureTimestampedSpeech(words, durationMs);
    if (!measurements) return NextResponse.json({ ok: true, measured: false });

    await admin.from("speech_words").delete().eq("session_id", sessionId).eq("user_id", user.id);
    await admin.from("speech_filler_moments").delete().eq("session_id", sessionId).eq("user_id", user.id);
    await admin.from("speech_pause_events").delete().eq("session_id", sessionId).eq("user_id", user.id);
    await admin.from("speech_replay_refs").delete().eq("session_id", sessionId).eq("user_id", user.id);

    const wordRows = words.map((word) => ({ session_id: sessionId, user_id: user.id, word: word.word, start_offset_ms: word.startOffsetMs, end_offset_ms: word.endOffsetMs, timing_source: "transcription" }));
    const { error: wordsError } = await admin.from("speech_words").insert(wordRows);
    if (wordsError) throw wordsError;
    if (measurements.pauses.length) {
      const { error: pauseError } = await admin.from("speech_pause_events").insert(measurements.pauses.map((pause) => ({ session_id: sessionId, user_id: user.id, ...pause })));
      if (pauseError) throw pauseError;
    }
    const replayRows = measurements.fillers.map((filler) => ({ session_id: sessionId, user_id: user.id, audio_path: audio.storage_path, start_offset_ms: filler.startOffsetMs, end_offset_ms: filler.endOffsetMs }));
    const { data: refs, error: refsError } = replayRows.length ? await admin.from("speech_replay_refs").insert(replayRows).select("id") : { data: [], error: null };
    if (refsError) throw refsError;
    const fillerRows = measurements.fillers.map((filler, index) => ({ session_id: sessionId, user_id: user.id, word: filler.word, occurrence_index: filler.occurrenceIndex, start_offset_ms: filler.startOffsetMs, end_offset_ms: filler.endOffsetMs, replay_ref_id: refs?.[index]?.id ?? null }));
    if (fillerRows.length) {
      const { error: fillerError } = await admin.from("speech_filler_moments").insert(fillerRows);
      if (fillerError) throw fillerError;
    }
    const { error: metricError } = await admin.from("speech_metrics").upsert({ session_id: sessionId, user_id: user.id, filler_count: measurements.fillerCount, filler_density_per_100_words: measurements.fillerDensityPer100Words, pace_wpm: measurements.paceWpm, pause_count: measurements.pauseCount, pause_total_ms: measurements.pauseTotalMs, longest_pause_ms: measurements.longestPauseMs, member_talk_time_pct: measurements.memberTalkTimePct, member_speaking_time_ms: measurements.memberSpeakingTimeMs, measured_at: new Date().toISOString() });
    if (metricError) throw metricError;
    return NextResponse.json({ ok: true, measured: true });
  } catch (error) {
    console.error("[speech] measurement failed", { sessionId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "measurement_failed" }, { status: 202 });
  }
}
