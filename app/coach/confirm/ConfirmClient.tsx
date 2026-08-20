"use client";

import { useEffect, useState, useTransition } from "react";
import {
  COACH_BOOT_ERROR,
  COACH_CONFIRM_CONTINUE,
  COACH_CONFIRM_DIFFICULTY,
  COACH_CONFIRM_EDIT,
  COACH_CONFIRM_FIRST_WORK,
  COACH_CONFIRM_LOST,
  COACH_CONFIRM_MOMENT,
  COACH_CONFIRM_TITLE,
  COACH_CONFIRM_WORKING_ON,
  COACH_PRODUCT_NAME,
} from "@/lib/assistant-coach/coach-copy";
import {
  isConfirmedForgeHandoffHref,
  isPracticableMoment,
} from "@/lib/assistant-coach/confirmation";

type ConfirmationFields = {
  workingOn: string;
  difficulty: string;
  identifiedMoment: string;
  firstWork: string;
};

const EMPTY: ConfirmationFields = {
  workingOn: "",
  difficulty: "",
  identifiedMoment: "",
  firstWork: "",
};

export default function ConfirmClient() {
  const [fields, setFields] = useState<ConfirmationFields>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assistant-coach/claim", {
          method: "POST",
          credentials: "same-origin",
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          window.location.assign("/signup?next=/coach/confirm");
          return;
        }
        if (res.status === 404 || body.code === "session_required") {
          if (!cancelled) {
            setLost(true);
            setError(
              typeof body.error === "string" ? body.error : COACH_CONFIRM_LOST
            );
          }
          return;
        }
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : COACH_BOOT_ERROR
          );
        }
        const c = body.confirmation ?? {};
        if (!cancelled) {
          setFields({
            workingOn: String(c.workingOn ?? ""),
            difficulty: String(c.difficulty ?? ""),
            identifiedMoment: String(c.identifiedMoment ?? ""),
            firstWork: String(c.firstWork ?? ""),
          });
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : COACH_BOOT_ERROR);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof ConfirmationFields>(
    key: K,
    value: string
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function continueToPractice() {
    if (pending) return;
    if (!isPracticableMoment(fields.identifiedMoment)) {
      setError(
        "Name the conversation you need to have — not only the topic — then continue."
      );
      setEditing(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/assistant-coach/confirm", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(fields),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Unable to continue."
          );
        }
        const href =
          typeof body.practiceHref === "string" ? body.practiceHref : "";
        if (!isConfirmedForgeHandoffHref(href)) {
          throw new Error(
            "Coach couldn’t carry this moment into practice. Try continuing again."
          );
        }
        window.location.assign(href);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to continue.");
      }
    });
  }

  return (
    <main className="ac-shell">
      <header className="ac-header">
        <p className="ac-kicker">TalkForge</p>
        <h1 className="ac-title">{COACH_PRODUCT_NAME}</h1>
        <p className="ac-lede">{COACH_CONFIRM_TITLE}</p>
      </header>

      {lost ? (
        <section className="ac-gate" role="status">
          <p className="ac-gate-copy">{error ?? COACH_CONFIRM_LOST}</p>
          <div className="ac-gate-actions">
            <a className="ac-btn ac-btn-primary" href="/coach">
              Start Coach
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className="ac-confirm" aria-label="Living Profile confirmation">
            <ConfirmField
              label={COACH_CONFIRM_WORKING_ON}
              value={fields.workingOn}
              editing={editing}
              onChange={(v) => update("workingOn", v)}
            />
            <ConfirmField
              label={COACH_CONFIRM_DIFFICULTY}
              value={fields.difficulty}
              editing={editing}
              onChange={(v) => update("difficulty", v)}
            />
            <ConfirmField
              label={COACH_CONFIRM_MOMENT}
              value={fields.identifiedMoment}
              editing={editing}
              onChange={(v) => update("identifiedMoment", v)}
            />
            <ConfirmField
              label={COACH_CONFIRM_FIRST_WORK}
              value={fields.firstWork}
              editing={editing}
              onChange={(v) => update("firstWork", v)}
            />
          </section>

          {error ? (
            <p className="ac-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ac-gate-actions">
            <button
              type="button"
              className="ac-btn"
              onClick={() => setEditing((v) => !v)}
              disabled={!ready || pending}
            >
              {COACH_CONFIRM_EDIT}
            </button>
            <button
              type="button"
              className="ac-btn ac-btn-primary"
              onClick={continueToPractice}
              disabled={!ready || pending || !isPracticableMoment(fields.identifiedMoment)}
            >
              {pending ? "Continuing…" : COACH_CONFIRM_CONTINUE}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function ConfirmField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <article className="ac-confirm-card">
      <h2 className="ac-confirm-label">{label}</h2>
      {editing ? (
        <textarea
          className="ac-confirm-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <p className="ac-copy">{value || "We’ll keep learning this with you."}</p>
      )}
    </article>
  );
}
