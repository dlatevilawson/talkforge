import type {
  ForgeEvent,
  RealityCapture,
  TransferSummary,
} from "./types";

const EVENTS_KEY = "talkforge.forge_events.v1";
const LINKS_KEY = "talkforge.session_event_links.v1";
const REALITY_KEY = "talkforge.reality_captures.v1";

type SessionEventLink = {
  sessionId: string;
  eventId: string;
  userId: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function listEvents(userId?: string): ForgeEvent[] {
  const all = readJson<ForgeEvent[]>(EVENTS_KEY, []);
  if (!userId) return all;
  return all.filter((event) => event.userId === userId);
}

export function getEvent(eventId: string): ForgeEvent | null {
  return listEvents().find((event) => event.id === eventId) ?? null;
}

export function saveEvent(event: ForgeEvent): ForgeEvent {
  const all = listEvents();
  const next = [event, ...all.filter((item) => item.id !== event.id)];
  writeJson(EVENTS_KEY, next);
  return event;
}

export function createEvent(input: {
  userId: string;
  track: ForgeEvent["track"];
  title: string;
  whenLabel: string;
  audience: string;
  successCriteria: string;
  companyContext?: string;
}): ForgeEvent {
  const event: ForgeEvent = {
    id: createId("event"),
    userId: input.userId,
    eventType: "technical_interview",
    track: input.track,
    title: input.title.trim(),
    whenLabel: input.whenLabel.trim(),
    audience: input.audience.trim(),
    successCriteria: input.successCriteria.trim(),
    companyContext: input.companyContext?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  return saveEvent(event);
}

export function linkSessionToEvent(input: {
  sessionId: string;
  eventId: string;
  userId: string;
}): void {
  const links = readJson<SessionEventLink[]>(LINKS_KEY, []);
  const next = [
    input,
    ...links.filter((link) => link.sessionId !== input.sessionId),
  ];
  writeJson(LINKS_KEY, next);
}

export function getEventIdForSession(sessionId: string): string | undefined {
  const links = readJson<SessionEventLink[]>(LINKS_KEY, []);
  return links.find((link) => link.sessionId === sessionId)?.eventId;
}

export function listRealityCaptures(userId?: string): RealityCapture[] {
  const all = readJson<RealityCapture[]>(REALITY_KEY, []);
  if (!userId) return all;
  return all.filter((item) => item.userId === userId);
}

export function getRealityCapture(
  sessionId: string
): RealityCapture | null {
  return (
    listRealityCaptures().find((item) => item.sessionId === sessionId) ?? null
  );
}

export function saveRealityCapture(
  capture: Omit<RealityCapture, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): RealityCapture {
  const record: RealityCapture = {
    id: capture.id ?? createId("reality"),
    createdAt: capture.createdAt ?? new Date().toISOString(),
    userId: capture.userId,
    sessionId: capture.sessionId,
    eventId: capture.eventId,
    status: capture.status,
    postponeReason: capture.postponeReason,
    wentBetter: capture.wentBetter,
    brokeUnderPressure: capture.brokeUnderPressure,
    replayMoment: capture.replayMoment,
    outcomeSignal: capture.outcomeSignal,
    readinessBefore: capture.readinessBefore,
    readinessAfter: capture.readinessAfter,
  };

  const all = listRealityCaptures();
  const next = [
    record,
    ...all.filter((item) => item.sessionId !== record.sessionId),
  ];
  writeJson(REALITY_KEY, next);
  return record;
}

export function getTransferSummary(userId?: string): TransferSummary {
  const events = listEvents(userId);
  const links = readJson<SessionEventLink[]>(LINKS_KEY, []).filter((link) =>
    userId ? link.userId === userId : true
  );
  const realities = listRealityCaptures(userId);

  return {
    eventsNamed: events.length,
    sessionsLinkedToEvents: links.length,
    realityCaptures: realities.length,
    conversationsAttempted: realities.filter(
      (item) => item.status === "happened" || item.status === "partial"
    ).length,
  };
}
