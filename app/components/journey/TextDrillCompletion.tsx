"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Drill } from "@/lib/drills/catalog";
import { createPracticeSession } from "@/lib/session";
import { persistSpeechCapture } from "@/lib/speech/persistence";
import { saveSession, saveSessionReport } from "@/lib/storage";
import { startSpeechRecorder, type SpeechRecorder } from "@/lib/ce/speech-capture";

export default function TextDrillCompletion({ drill, programId }: { drill: Drill; programId: string }) {
  const router = useRouter();
  const recorderRef = useRef<SpeechRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [micMessage, setMicMessage] = useState("");

  async function startRecording() {
    setError("");
    setMicMessage("");
    if (!notes.trim()) {
      setError("Write your answer before recording the spoken rep.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicMessage("This browser cannot record audio. You can choose the text-only path below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = startSpeechRecorder(stream);
      if (!recorder) {
        stream.getTracks().forEach((track) => track.stop());
        setMicMessage("Recording is unavailable here. You can choose the text-only path below.");
        return;
      }
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch {
      setMicMessage("Microphone access was not granted. You can choose the text-only path below.");
    }
  }

  async function finishRecordedRep() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setSaving(true);
    setError("");
    setRecording(false);
    recorderRef.current = null;
    const blob = await recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (!blob || blob.size === 0) {
      setError("No spoken rep was captured. Record again or choose the explicit text-only path.");
      setSaving(false);
      return;
    }
    try {
      const session = await createPracticeSession({
        scenarioId: drill.id,
        scenarioTitle: drill.name,
        missionPrompt: drill.instructions,
        modality: "voice",
        drillId: drill.id,
        programId,
        purpose: "drill",
      });
      const durationSeconds = Math.max(1, Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
      const completedAt = new Date().toISOString();
      await saveSession({ ...session, completedAt, durationSeconds, modality: "voice" });
      await persistSpeechCapture({ sessionId: session.id, userId: session.userId, durationSeconds, fillerCount: null, capture: { audioBlob: blob, turns: [] } });
      await saveSessionReport({
        sessionId: session.id, userId: session.userId, sessionNumber: 1, modality: "voice", durationSeconds,
        overallScore: null, confidence: null, empathy: null, listening: null, clarity: null, storytelling: null, negotiation: null, leadership: null,
        questionsAsked: 0, interruptions: 0, fillerWords: 0,
        breakthrough: "Your spoken rep is saved.", biggestWeakness: "Measurement is still running.", homework: "Review the measured delivery details when they arrive.", coachSummary: "Your spoken rep is saved. Measurement is running.", transcript: [], createdAt: completedAt, scenarioTitle: drill.name, startedAt: session.startedAt, completedAt,
      });
      const completion = await fetch("/api/journey/complete-day", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programId, drillId: drill.id, sessionId: session.id, notes, completedAt }) });
      if (!completion.ok) throw new Error("Could not complete this training day.");
      void fetch("/api/speech/measure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: session.id }) });
      router.push(`/app/reflect/${session.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this spoken rep. Try again.");
      setSaving(false);
    }
  }

  async function completeTextOnly() {
    setSaving(true);
    setError("");
    if (!notes.trim()) {
      setError("Write your answer before choosing the text-only path.");
      setSaving(false);
      return;
    }
    const response = await fetch("/api/journey/complete-day", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programId, drillId: drill.id, notes, textOnly: true }) });
    if (!response.ok) {
      setError("Could not save this text-only rep. Try again.");
      setSaving(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100"><div className="mx-auto max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">Today’s practice · {drill.modality}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{drill.name}</h1>
      <p className="mt-3 text-zinc-400">{drill.durationMinutes} minutes · {drill.signal}</p>
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-lg leading-8 text-zinc-200">{drill.instructions}</p><p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-400">Look for: {drill.goodLooksLike}</p></section>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Write your answer first, then say it aloud (optional log afterward)" className="mt-6 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-[#c9a95f]" />
      <p className="mt-4 text-sm leading-6 text-zinc-400">This drill asks you to speak your written answer aloud. Recording is explicit and is used only to measure this rep.</p>
      {micMessage ? <p className="mt-3 text-sm text-amber-200" role="status">{micMessage}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {!recording ? <button type="button" onClick={() => void startRecording()} disabled={saving} className="rounded-full bg-[#f4f0e8] px-6 py-3 font-semibold text-black">Record spoken rep</button> : <button type="button" onClick={() => void finishRecordedRep()} disabled={saving} className="rounded-full bg-red-400 px-6 py-3 font-semibold text-black">Stop recording</button>}
        <button type="button" onClick={() => void completeTextOnly()} disabled={saving || recording} className="rounded-full border border-white/20 px-6 py-3 text-sm text-zinc-200">Complete text-only</button>
      </div>
      {saving ? <p className="mt-3 text-sm text-zinc-500">Saving this rep…</p> : null}
    </div></main>
  );
}
