"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  CoachMicError,
  requestCoachMicrophoneStream,
  startCoachRecording,
  stopMediaStream,
  type CoachRecordingSession,
} from "@/lib/assistant-coach/browser-mic";
import {
  COACH_BOOT_ERROR,
  COACH_EMPTY_HINT,
  COACH_GATE_COPY,
  COACH_GATE_TITLE,
  COACH_OPENING,
  COACH_PRODUCT_NAME,
  COACH_STARTERS,
  COACH_STATE_LISTENING,
  COACH_STATE_THINKING,
  COACH_STATE_TRANSCRIBING,
  getCoachComposerPlaceholder,
  inferCoachStarterId,
  type CoachStarter,
  type CoachStarterId,
} from "@/lib/assistant-coach/coach-copy";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type GateState = {
  hasExperiencedValue: boolean;
  mustAuthenticateToContinue: boolean;
  copyKey: string;
};

type SessionState = {
  id: string;
  status: string;
  turnCount: number;
  hasExperiencedValue: boolean;
  expiresAt: string;
};

type ComposerPhase = "idle" | "recording" | "transcribing" | "thinking";

const MINT_KEY_STORAGE = "tf_ac_mint_key_v1";

function createMintKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getOrCreateMintKey(): string {
  try {
    const existing = sessionStorage.getItem(MINT_KEY_STORAGE);
    if (existing && existing.length >= 43 && existing.length <= 128) {
      return existing;
    }
    const next = createMintKey();
    sessionStorage.setItem(MINT_KEY_STORAGE, next);
    return next;
  } catch {
    return createMintKey();
  }
}

function createClientTurnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cturn_${crypto.randomUUID()}`;
  }
  return `cturn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AssistantCoachClient() {
  const formId = useId();
  const threadRef = useRef<HTMLElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const nearBottomRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<CoachRecordingSession | null>(null);

  const [bootError, setBootError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedStarterId, setSelectedStarterId] =
    useState<CoachStarterId | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ComposerPhase>("idle");
  const [pending, startTransition] = useTransition();

  const gated = Boolean(gate?.mustAuthenticateToContinue);
  const busy = phase !== "idle" || pending;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mintKey = getOrCreateMintKey();
        const res = await fetch("/api/assistant-coach/session", {
          method: "POST",
          headers: {
            "Idempotency-Key": mintKey,
          },
          credentials: "same-origin",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error("Coach session boot failed", body);
          throw new Error(COACH_BOOT_ERROR);
        }
        if (cancelled) return;
        setSession(body.session);
        setGate(body.gate ?? null);
        const restored = Array.isArray(body.messages)
          ? body.messages.map(
              (m: {
                id: string;
                role: "user" | "assistant";
                content: string;
              }) => ({
                id: m.id,
                role: m.role,
                content: m.content,
              })
            )
          : [];
        setMessages(restored);
        setSelectedStarterId(
          inferCoachStarterId(
            restored.find((message: ChatMessage) => message.role === "user")
              ?.content
          )
        );
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : COACH_BOOT_ERROR
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      recordingRef.current?.cancel();
      recordingRef.current = null;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyViewport = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;
      root.style.setProperty("--ac-vvh", `${Math.round(height)}px`);
      root.style.setProperty("--ac-vvt", `${Math.round(top)}px`);
    };
    applyViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", applyViewport);
    vv?.addEventListener("scroll", applyViewport);
    window.addEventListener("orientationchange", applyViewport);
    return () => {
      vv?.removeEventListener("resize", applyViewport);
      vv?.removeEventListener("scroll", applyViewport);
      window.removeEventListener("orientationchange", applyViewport);
      root.style.removeProperty("--ac-vvh");
      root.style.removeProperty("--ac-vvt");
    };
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const onScroll = () => {
      const remaining =
        thread.scrollHeight - thread.scrollTop - thread.clientHeight;
      nearBottomRef.current = remaining < 96;
    };
    onScroll();
    thread.addEventListener("scroll", onScroll, { passive: true });
    return () => thread.removeEventListener("scroll", onScroll);
  }, [ready]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread || !nearBottomRef.current) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, phase, pending]);

  function growComposer(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || gated) return;
    setSendError(null);
    const clientTurnId = createClientTurnId();
    const optimisticId = `local_${clientTurnId}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: trimmed },
    ]);
    setDraft("");
    setPhase("thinking");
    if (composerInputRef.current) {
      composerInputRef.current.style.height = "auto";
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/assistant-coach/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: trimmed, clientTurnId }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body.code === "must_authenticate") {
          if (body.session) setSession(body.session);
          if (body.gate) setGate(body.gate);
          setSendError(null);
          return;
        }
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Unable to complete that turn."
          );
        }
        setSession(body.session);
        setGate(body.gate ?? null);
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
          return [
            ...withoutOptimistic,
            { id: `${clientTurnId}_user`, role: "user", content: trimmed },
            {
              id: `${clientTurnId}_assistant`,
              role: "assistant",
              content: body.reply,
            },
          ];
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDraft(trimmed);
        setSendError(
          err instanceof Error ? err.message : "Unable to complete that turn."
        );
      } finally {
        setPhase("idle");
      }
    });
  }

  function chooseStarter(starter: CoachStarter) {
    setSelectedStarterId(starter.id);
    if (starter.message) {
      sendMessage(starter.message);
      return;
    }
    composerInputRef.current?.focus();
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || gated) return;
    sendMessage(draft);
  }

  async function startRecording() {
    if (busy || gated) return;
    setSendError(null);
    try {
      const stream = await requestCoachMicrophoneStream();
      streamRef.current = stream;
      recordingRef.current = startCoachRecording(stream);
      setPhase("recording");
    } catch (err) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      recordingRef.current = null;
      setPhase("idle");
      setSendError(
        err instanceof CoachMicError
          ? err.message
          : "Unable to access the microphone."
      );
    }
  }

  function cancelRecording() {
    recordingRef.current?.cancel();
    recordingRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setPhase("idle");
  }

  async function finishRecording() {
    if (phase !== "recording" || !recordingRef.current) return;
    const sessionRec = recordingRef.current;
    recordingRef.current = null;
    setPhase("transcribing");
    try {
      const blob = await sessionRec.stop();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      if (!blob.size) {
        setPhase("idle");
        setSendError("Nothing was recorded. Try again.");
        return;
      }
      const form = new FormData();
      form.append(
        "audio",
        blob,
        blob.type.includes("mp4") ? "coach.m4a" : "coach.webm"
      );
      const res = await fetch("/api/assistant-coach/transcribe", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 403 && body.code === "must_authenticate") {
        if (body.session) setSession(body.session);
        if (body.gate) setGate(body.gate);
        setPhase("idle");
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to transcribe recording."
        );
      }
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        setPhase("idle");
        setSendError("Could not understand that recording. Try again.");
        return;
      }
      setDraft(text);
      setPhase("idle");
    } catch (err) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      setPhase("idle");
      setSendError(
        err instanceof Error ? err.message : "Unable to transcribe recording."
      );
    }
  }

  const statusLabel =
    phase === "recording"
      ? COACH_STATE_LISTENING
      : phase === "transcribing"
        ? COACH_STATE_TRANSCRIBING
        : phase === "thinking" || pending
          ? COACH_STATE_THINKING
          : null;

  if (bootError) {
    return (
      <main className="ac-shell">
        <div className="ac-panel">
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">{COACH_PRODUCT_NAME}</h1>
          <p className="ac-error" role="alert">
            {bootError}
          </p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="ac-shell">
        <div className="ac-panel">
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">{COACH_PRODUCT_NAME}</h1>
          <p className="ac-muted">Getting ready…</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        messages.length > 0
          ? "ac-shell ac-shell-chat ac-has-messages"
          : "ac-shell ac-shell-chat"
      }
    >
      <header className="ac-header">
        <p className="ac-kicker">TalkForge</p>
        <h1 className="ac-title">{COACH_PRODUCT_NAME}</h1>
        {messages.length === 0 ? (
          <p className="ac-lede">{COACH_OPENING}</p>
        ) : null}
      </header>

      <section
        ref={threadRef}
        className="ac-thread"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <div className="ac-empty-state">
            <p className="ac-empty">{COACH_EMPTY_HINT}</p>
            <div
              className="ac-starters"
              role="group"
              aria-label="Common conversation types"
            >
              {COACH_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  className="ac-starter"
                  disabled={busy}
                  onClick={() => chooseStarter(starter)}
                >
                  {starter.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className={
                m.role === "user" ? "ac-bubble ac-bubble-user" : "ac-bubble"
              }
            >
              <p className="ac-role">
                {m.role === "user" ? "You" : COACH_PRODUCT_NAME}
              </p>
              <p className="ac-copy">{m.content}</p>
            </article>
          ))
        )}
        {statusLabel ? (
          <p
            className={
              phase === "recording"
                ? "ac-muted ac-status ac-status-live"
                : "ac-muted ac-status ac-thinking"
            }
            aria-live="polite"
          >
            {statusLabel}
          </p>
        ) : null}
      </section>

      {gated ? (
        <aside className="ac-gate" role="status">
          <h2 className="ac-gate-title">{COACH_GATE_TITLE}</h2>
          <p className="ac-gate-copy">{COACH_GATE_COPY}</p>
          <div className="ac-gate-actions">
            <a className="ac-btn ac-btn-primary" href="/signup?next=/coach/confirm">
              Create account
            </a>
            <a className="ac-btn" href="/login?next=/coach/confirm">
              Sign in
            </a>
          </div>
        </aside>
      ) : (
        <form id={formId} className="ac-composer" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={`${formId}-input`}>
            Message
          </label>
          {phase === "recording" ? (
            <div className="ac-composer-dock">
              <p className="ac-muted ac-status ac-status-live" aria-live="polite">
                {COACH_STATE_LISTENING}
              </p>
              <button
                type="button"
                className="ac-btn ac-btn-danger"
                onClick={cancelRecording}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ac-btn ac-btn-primary"
                onClick={() => void finishRecording()}
              >
                Done
              </button>
            </div>
          ) : (
            <div className="ac-composer-dock">
              <button
                type="button"
                className="ac-btn ac-btn-icon ac-mic"
                onClick={() => void startRecording()}
                disabled={busy}
                aria-label="Speak with Coach"
              >
                Speak
              </button>
              <textarea
                ref={composerInputRef}
                id={`${formId}-input`}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  growComposer(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && draft.trim()) sendMessage(draft);
                  }
                }}
                rows={1}
                placeholder={getCoachComposerPlaceholder(selectedStarterId)}
                disabled={busy}
                enterKeyHint="send"
              />
              <button
                type="submit"
                className="ac-btn ac-btn-primary ac-btn-icon"
                disabled={busy || !draft.trim()}
                aria-label={
                  phase === "thinking" || pending ? "Sending" : "Send"
                }
              >
                {phase === "thinking" || pending ? "…" : "Send"}
              </button>
            </div>
          )}
          {sendError ? (
            <p className="ac-error" role="alert">
              {sendError}
            </p>
          ) : null}
        </form>
      )}
    </main>
  );
}
