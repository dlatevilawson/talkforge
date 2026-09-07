"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  PRACTICE_AUDIENCE_CATALOG,
  PRACTICE_PATTERN_CATALOG,
  PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH,
  PRACTICE_TOPIC_CATALOG,
  PRACTICE_URGENCY_CATALOG,
  isCompleteMemberPracticeProfileSelection,
  projectMemberPracticeProfile,
  selectMemberPracticeProfileSelection,
  type MemberPracticeProfileSelection,
  type PracticeAudienceId,
  type PracticePatternId,
  type PracticeProfileProjection,
  type PracticeTopicId,
  type PracticeTopicSelection,
  type PracticeUrgencyId,
} from "@/lib/assistant-coach/practice-profile";
import { COACH_WIZARD_PRACTICE_DESTINATION } from "@/lib/assistant-coach/forge-handoff";

type WizardPhase = 1 | 2 | 3;

type WizardState = {
  sessionId: string | null;
  phase: WizardPhase;
  topics: PracticeTopicSelection[];
  audiences: PracticeAudienceId[];
  pattern: PracticePatternId | null;
  urgency: PracticeUrgencyId | null;
  verified: boolean;
};

const WIZARD_STORAGE_KEY = "tf_coach_card_wizard_v1";
const MINT_KEY_STORAGE = "tf_ac_mint_key_v1";

const EMPTY_WIZARD: WizardState = {
  sessionId: null,
  phase: 1,
  topics: [],
  audiences: [],
  pattern: null,
  urgency: null,
  verified: false,
};

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="ac-topic-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <IconFrame>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </IconFrame>
  );
}

function TrendingUpIcon() {
  return (
    <IconFrame>
      <path d="M3 17l6-6 4 4 8-9M15 6h6v6" />
    </IconFrame>
  );
}

function MessageSquareWarningIcon() {
  return (
    <IconFrame>
      <path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-5a3 3 0 0 1-1-2V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3zM12 7v4M12 14h.01" />
    </IconFrame>
  );
}

function ShieldIcon() {
  return (
    <IconFrame>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
    </IconFrame>
  );
}

function MicIcon() {
  return (
    <IconFrame>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </IconFrame>
  );
}

function ZapIcon() {
  return (
    <IconFrame>
      <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
    </IconFrame>
  );
}

function HandIcon() {
  return (
    <IconFrame>
      <path d="M7 11V6a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v6-4a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-3l-2-3a2 2 0 0 1 3-3z" />
    </IconFrame>
  );
}

function EarIcon() {
  return (
    <IconFrame>
      <path d="M6 10a6 6 0 1 1 10 4c-2 2-2 6-5 6a3 3 0 0 1-3-3M10 11a2 2 0 1 1 3 2c-1 1-1 3-2 3" />
    </IconFrame>
  );
}

function ScissorsIcon() {
  return (
    <IconFrame>
      <circle cx="6" cy="7" r="3" />
      <circle cx="6" cy="17" r="3" />
      <path d="M8.5 8.5L21 3M8.5 15.5L21 21M11 12l3-1.5" />
    </IconFrame>
  );
}

function PlusIcon() {
  return (
    <IconFrame>
      <path d="M12 5v14M5 12h14" />
    </IconFrame>
  );
}

const TOPIC_ICON_BY_ID: Record<
  PracticeTopicId,
  ComponentType
> = {
  job_interview: BriefcaseIcon,
  salary_raise_negotiation: TrendingUpIcon,
  giving_difficult_feedback: MessageSquareWarningIcon,
  setting_a_boundary: ShieldIcon,
  pitch_or_presentation: MicIcon,
  handling_conflict: ZapIcon,
  asking_for_something_i_need: HandIcon,
  receiving_critical_feedback: EarIcon,
  ending_a_relationship: ScissorsIcon,
  something_else: PlusIcon,
};

function createMintKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
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

function isCatalogId<T extends string>(
  value: unknown,
  catalog: readonly { id: T }[]
): value is T {
  return typeof value === "string" && catalog.some((item) => item.id === value);
}

function restoreWizardState(raw: string | null): WizardState {
  if (!raw) return EMPTY_WIZARD;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const topics = Array.isArray(value.topics)
      ? value.topics
          .map((item): PracticeTopicSelection | null => {
            if (!item || typeof item !== "object") return null;
            const topic = item as Record<string, unknown>;
            if (!isCatalogId(topic.id, PRACTICE_TOPIC_CATALOG)) return null;
            const customText =
              typeof topic.customText === "string" ? topic.customText : null;
            return { id: topic.id, customText };
          })
          .filter((item): item is PracticeTopicSelection => item !== null)
          .filter(
            (item, index, all) =>
              all.findIndex((candidate) => candidate.id === item.id) === index
          )
          .slice(0, 3)
      : [];
    const audiences = Array.isArray(value.audiences)
      ? value.audiences
          .filter((id): id is PracticeAudienceId =>
            isCatalogId(id, PRACTICE_AUDIENCE_CATALOG)
          )
          .filter((id, index, all) => all.indexOf(id) === index)
      : [];
    const pattern = isCatalogId(value.pattern, PRACTICE_PATTERN_CATALOG)
      ? value.pattern
      : null;
    const urgency = isCatalogId(value.urgency, PRACTICE_URGENCY_CATALOG)
      ? value.urgency
      : null;
    const requestedPhase =
      value.phase === 2 || value.phase === 3 ? value.phase : 1;
    const sessionId =
      typeof value.sessionId === "string" && value.sessionId
        ? value.sessionId
        : null;
    const selection = { topics, audiences, pattern, urgency };
    const complete = isCompleteSelection(selection);
    return {
      ...selection,
      sessionId,
      phase: requestedPhase === 3 && !complete ? 2 : requestedPhase,
      verified: Boolean(value.verified) && complete,
    };
  } catch {
    return EMPTY_WIZARD;
  }
}

function isValidTopicSelection(topics: PracticeTopicSelection[]): boolean {
  if (topics.length < 1 || topics.length > 3) return false;
  const custom = topics.find((topic) => topic.id === "something_else");
  if (!custom) return true;
  const length = custom.customText?.trim().length ?? 0;
  return length >= 1 && length <= PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH;
}

function isCompleteSelection(value: {
  topics: PracticeTopicSelection[];
  audiences: PracticeAudienceId[];
  pattern: PracticePatternId | null;
  urgency: PracticeUrgencyId | null;
}): value is MemberPracticeProfileSelection {
  return isCompleteMemberPracticeProfileSelection(value);
}

export default function AssistantCoachClient() {
  const router = useRouter();
  const customInputId = useId();
  const [wizard, setWizard] = useState<WizardState>(EMPTY_WIZARD);
  const [restored, setRestored] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverProjection, setServerProjection] =
    useState<PracticeProfileProjection | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setWizard(restoreWizardState(sessionStorage.getItem(WIZARD_STORAGE_KEY)));
      setRestored(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(wizard));
    } catch {
      // Browser storage can be unavailable; the signed server session remains.
    }
  }, [restored, wizard]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/assistant-coach/session", {
          method: "POST",
          headers: { "Idempotency-Key": getOrCreateMintKey() },
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Coach could not get ready.");
        const body = await response.json();
        const sessionId =
          typeof body?.session?.id === "string" ? body.session.id : null;
        if (!sessionId) throw new Error("Coach could not get ready.");
        if (!cancelled) {
          setWizard((current) =>
            current.sessionId && current.sessionId !== sessionId
              ? { ...EMPTY_WIZARD, sessionId }
              : { ...current, sessionId }
          );
          setSessionReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(
            error instanceof Error ? error.message : "Coach could not get ready."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTopic(id: PracticeTopicId) {
    setSaveError(null);
    setWizard((current) => {
      const selected = current.topics.some((topic) => topic.id === id);
      const topics = selected
        ? current.topics.filter((topic) => topic.id !== id)
        : current.topics.length < 3
          ? [...current.topics, { id, customText: null }]
          : current.topics;
      return { ...current, topics, verified: false };
    });
  }

  function toggleAudience(id: PracticeAudienceId) {
    setSaveError(null);
    setWizard((current) => {
      const selected = current.audiences.includes(id);
      return {
        ...current,
        audiences: selected
          ? current.audiences.filter((audience) => audience !== id)
          : [...current.audiences, id],
        verified: false,
      };
    });
  }

  function completeProfile() {
    const selectionAtClick = selectMemberPracticeProfileSelection(wizard);
    const completeAtClick = isCompleteSelection(selectionAtClick);
    if (!completeAtClick) return;
    setServerProjection(null);
    setSaveError(null);
    setWizard((current) => ({ ...current, phase: 3, verified: false }));
  }

  function saveProfile() {
    const selection = selectMemberPracticeProfileSelection(wizard);
    if (!isCompleteSelection(selection) || pending) return;
    setSaveError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/assistant-coach/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            selection,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Coach could not save your profile."
          );
        }
        setServerProjection(body.projection);
        if (body.destination === COACH_WIZARD_PRACTICE_DESTINATION) {
          router.replace(COACH_WIZARD_PRACTICE_DESTINATION);
          return;
        }
        setWizard((current) => ({ ...current, verified: true }));
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Coach could not save your profile."
        );
      }
    });
  }

  if (bootError) {
    return (
      <main className="ac-shell">
        <header className="ac-header">
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">Coach</h1>
        </header>
        <p className="ac-error" role="alert">
          {bootError}
        </p>
      </main>
    );
  }

  if (!restored || !sessionReady) {
    return (
      <main className="ac-shell">
        <header className="ac-header">
          <p className="ac-kicker">TalkForge</p>
          <h1 className="ac-title">Coach</h1>
        </header>
        <p className="ac-muted">Getting ready…</p>
      </main>
    );
  }

  const selection = selectMemberPracticeProfileSelection(wizard);
  const complete = isCompleteSelection(selection);
  const localProjection = complete
    ? projectMemberPracticeProfile(selection)
    : null;
  const projection = serverProjection ?? localProjection;

  return (
    <main className="ac-shell ac-wizard">
      <header className="ac-header">
        <p className="ac-kicker">TalkForge</p>
        <h1 className="ac-title">Coach</h1>
        <p className="ac-step" aria-live="polite">
          Step {wizard.phase} of 3
        </p>
      </header>

      {wizard.phase === 1 ? (
        <section className="ac-phase" aria-labelledby="pick-moments-title">
          <div className="ac-phase-heading">
            <h2 id="pick-moments-title">Pick your moments</h2>
            <p>Choose up to three conversations you want to feel ready for.</p>
            <p className="ac-count" aria-live="polite">
              {wizard.topics.length} of 3 selected
            </p>
          </div>
          <div className="ac-card-grid" role="group" aria-label="Conversation moments">
            {PRACTICE_TOPIC_CATALOG.map((topic) => {
              const selected = wizard.topics.some(
                (selection) => selection.id === topic.id
              );
              const TopicIcon = TOPIC_ICON_BY_ID[topic.id];
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="ac-choice-card"
                  aria-pressed={selected}
                  disabled={!selected && wizard.topics.length === 3}
                  onClick={() => toggleTopic(topic.id)}
                >
                  <span className="ac-choice-main">
                    <TopicIcon />
                    <span>{topic.label}</span>
                  </span>
                  {selected ? <span aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>
          {wizard.topics.some((topic) => topic.id === "something_else") ? (
            <div className="ac-custom-field">
              <label htmlFor={customInputId}>What moment do you have in mind?</label>
              <textarea
                id={customInputId}
                rows={3}
                maxLength={PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH}
                value={
                  wizard.topics.find((topic) => topic.id === "something_else")
                    ?.customText ?? ""
                }
                onChange={(event) => {
                  const customText = event.target.value;
                  setWizard((current) => ({
                    ...current,
                    topics: current.topics.map((topic) =>
                      topic.id === "something_else"
                        ? { ...topic, customText }
                        : topic
                    ),
                    verified: false,
                  }));
                }}
              />
              <p className="ac-field-note">
                {(wizard.topics.find((topic) => topic.id === "something_else")
                  ?.customText?.length ?? 0)}{" "}
                / {PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH}
              </p>
            </div>
          ) : null}
          <div className="ac-actions">
            <button
              type="button"
              className="ac-btn ac-btn-primary"
              disabled={!isValidTopicSelection(wizard.topics)}
              onClick={() =>
                setWizard((current) => ({ ...current, phase: 2 }))
              }
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      {wizard.phase === 2 ? (
        <section className="ac-phase" aria-labelledby="narrow-context-title">
          <div className="ac-phase-heading">
            <h2 id="narrow-context-title">Narrow the context</h2>
            <p>A few choices help Coach shape where you begin.</p>
          </div>

          <fieldset className="ac-question">
            <legend>Who are these conversations with?</legend>
            <p className="ac-question-note">Choose all that fit.</p>
            <div className="ac-card-grid ac-card-grid-compact">
              {PRACTICE_AUDIENCE_CATALOG.map((audience) => {
                const selected = wizard.audiences.includes(audience.id);
                return (
                  <button
                    key={audience.id}
                    type="button"
                    className="ac-choice-card"
                    aria-pressed={selected}
                    onClick={() => toggleAudience(audience.id)}
                  >
                    <span>{audience.label}</span>
                    {selected ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="ac-question">
            <legend>What trips you up most?</legend>
            <div className="ac-card-grid" role="radiogroup">
              {PRACTICE_PATTERN_CATALOG.map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  role="radio"
                  aria-checked={wizard.pattern === pattern.id}
                  className="ac-choice-card"
                  onClick={() =>
                    setWizard((current) => ({
                      ...current,
                      pattern: pattern.id,
                      verified: false,
                    }))
                  }
                >
                  <span>{pattern.label}</span>
                  {wizard.pattern === pattern.id ? (
                    <span aria-hidden="true">✓</span>
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="ac-question">
            <legend>When is this happening?</legend>
            <div className="ac-card-grid ac-card-grid-compact" role="radiogroup">
              {PRACTICE_URGENCY_CATALOG.map((urgency) => (
                <button
                  key={urgency.id}
                  type="button"
                  role="radio"
                  aria-checked={wizard.urgency === urgency.id}
                  className="ac-choice-card"
                  onClick={() =>
                    setWizard((current) => ({
                      ...current,
                      urgency: urgency.id,
                      verified: false,
                    }))
                  }
                >
                  <span>{urgency.label}</span>
                  {wizard.urgency === urgency.id ? (
                    <span aria-hidden="true">✓</span>
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="ac-actions ac-actions-split">
            <button
              type="button"
              className="ac-btn"
              onClick={() =>
                setWizard((current) => ({ ...current, phase: 1 }))
              }
            >
              Back
            </button>
            <button
              type="button"
              className="ac-btn ac-btn-primary"
              disabled={!complete}
              onClick={completeProfile}
            >
              Diagnose
            </button>
          </div>
        </section>
      ) : null}

      {wizard.phase === 3 && projection ? (
        <section className="ac-phase" aria-labelledby="coach-profile-title">
          <div className="ac-profile-card">
            <p className="ac-profile-label">Your Coach profile</p>
            <h2 id="coach-profile-title">A clear place to begin</h2>

            <div className="ac-profile-section">
              <h3>Focus areas</h3>
              <dl className="ac-profile-list">
                <div>
                  <dt>Moments</dt>
                  <dd>{projection.focusAreas.topics.join(", ")}</dd>
                </div>
                <div>
                  <dt>People</dt>
                  <dd>{projection.focusAreas.audiences.join(", ")}</dd>
                </div>
                <div>
                  <dt>Timing</dt>
                  <dd>{projection.focusAreas.urgency}</dd>
                </div>
              </dl>
            </div>

            <div className="ac-profile-section">
              <h3>Your practice pattern</h3>
              <p>{projection.patternTemplate}</p>
            </div>

            <div className="ac-profile-section ac-profile-target">
              <h3>Your first target</h3>
              <p>{projection.initialForgeTarget}</p>
            </div>
          </div>

          {wizard.verified ? (
            <aside className="ac-auth-gate" role="status">
              <h2>Keep this profile with you</h2>
              <p>Create an account or sign in to start coaching in Forge.</p>
              <div className="ac-actions">
                <a
                  className="ac-btn ac-btn-primary"
                  href="/signup?next=/coach/activate"
                >
                  Create account
                </a>
                <a className="ac-btn" href="/login?next=/coach/activate">
                  Sign in
                </a>
              </div>
            </aside>
          ) : (
            <div className="ac-actions ac-actions-split">
              <button
                type="button"
                className="ac-btn"
                disabled={pending}
                onClick={() =>
                  setWizard((current) => ({
                    ...current,
                    phase: 2,
                    verified: false,
                  }))
                }
              >
                Adjust
              </button>
              <button
                type="button"
                className="ac-btn ac-btn-primary"
                disabled={pending}
                onClick={saveProfile}
              >
                {pending ? "Saving…" : "Looks right"}
              </button>
            </div>
          )}
          {saveError ? (
            <p className="ac-error" role="alert">
              {saveError}
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
