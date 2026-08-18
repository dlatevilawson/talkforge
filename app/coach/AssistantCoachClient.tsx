"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type GateState = {
  hasExperiencedValue: boolean;
  anonTurnCount: number;
  turnCap?: number | null;
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

const MINT_KEY_STORAGE = "tf_ac_mint_key_v1";

function createMintKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Unable to start Assistant Coach."
          );
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
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : "Unable to start Assistant Coach."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || gate?.mustAuthenticateToContinue) return;
    setSendError(null);
    const clientTurnId = createClientTurnId();
    const optimisticId = `local_${clientTurnId}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text },
    ]);
    setDraft("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/assistant-coach/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: text, clientTurnId }),
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
            { id: `${clientTurnId}_user`, role: "user", content: text },
            {
              id: `${clientTurnId}_assistant`,
              role: "assistant",
              content: body.reply,
            },
          ];
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDraft(text);
        setSendError(
          err instanceof Error ? err.message : "Unable to complete that turn."
        );
      }
    });
  }

  if (bootError) {
    return (
      <main className="ac-shell">
        <div className="ac-panel">
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">Assistant Coach</h1>
          <p className="ac-error" role="alert">
            {bootError}
          </p>
          <p className="ac-muted">
            If this keeps happening, confirm the preview has{" "}
            <code>ASSISTANT_COACH_ANON_COOKIE_SECRET</code> configured.
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
          <h1 className="ac-title">Assistant Coach</h1>
          <p className="ac-muted">Preparing your conversation…</p>
        </div>
      </main>
    );
  }

  const gated = Boolean(gate?.mustAuthenticateToContinue);

  return (
    <main className="ac-shell">
      <header className="ac-header">
        <div>
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">Assistant Coach</h1>
          <p className="ac-lede">
            Tell me about a conversation that matters — what happens when you
            try to speak.
          </p>
        </div>
        {session ? (
          <p className="ac-meta" aria-live="polite">
            Session {session.status}
            {typeof gate?.anonTurnCount === "number"
              ? ` · turn ${gate.anonTurnCount}`
              : ""}
          </p>
        ) : null}
      </header>

      <section className="ac-thread" aria-label="Conversation">
        {messages.length === 0 ? (
          <p className="ac-empty">
            Start with something real. For example: “I freeze when my manager
            asks me a question in meetings.”
          </p>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className={
                m.role === "user" ? "ac-bubble ac-bubble-user" : "ac-bubble"
              }
            >
              <p className="ac-role">
                {m.role === "user" ? "You" : "Assistant Coach"}
              </p>
              <p className="ac-copy">{m.content}</p>
            </article>
          ))
        )}
        {pending ? (
          <p className="ac-muted ac-thinking">Coach is listening…</p>
        ) : null}
        <div ref={bottomRef} />
      </section>

      {gated ? (
        <aside className="ac-gate" role="status">
          <h2 className="ac-gate-title">Save this understanding</h2>
          <p className="ac-gate-copy">
            You’ve reached a meaningful moment. Create an account or sign in to
            continue — your conversation stays with you.
          </p>
          <div className="ac-gate-actions">
            <a className="ac-btn ac-btn-primary" href="/signup?next=/coach">
              Create account
            </a>
            <a className="ac-btn" href="/login?next=/coach">
              Sign in
            </a>
          </div>
          <p className="ac-muted">
            Claim continuity ships in a later slice — for now this gate marks
            the Decision 059 hard stop after value.
          </p>
        </aside>
      ) : (
        <form id={formId} className="ac-composer" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={`${formId}-input`}>
            Message
          </label>
          <textarea
            id={`${formId}-input`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="What’s hard about the conversation?"
            disabled={pending}
          />
          {sendError ? (
            <p className="ac-error" role="alert">
              {sendError}
            </p>
          ) : null}
          <button
            type="submit"
            className="ac-btn ac-btn-primary"
            disabled={pending || !draft.trim()}
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </main>
  );
}
