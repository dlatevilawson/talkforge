import type { StaffEvent, StaffEventName } from "./events";
import { shouldCorruptPublish, shouldDropEvent } from "./fault";

type Handler = (event: StaffEvent) => void;

const handlers = new Map<StaffEventName | "*", Set<Handler>>();
const log: StaffEvent[] = [];

export function resetStaffBus(): void {
  handlers.clear();
  log.length = 0;
}

export function subscribe(name: StaffEventName | "*", handler: Handler): () => void {
  let set = handlers.get(name);
  if (!set) {
    set = new Set();
    handlers.set(name, set);
  }
  set.add(handler);
  return () => set!.delete(handler);
}

export function publish(event: StaffEvent): void {
  // WP-S4: controlled drop — communication path failure (fail visible, not silent success)
  if (shouldDropEvent(event.name)) {
    log.push({
      ...event,
      name: "atlas.program.blocked",
      publisher: "AIO-CORE",
      payload: {
        reason: `event_dropped:${event.name}`,
        original: event.name,
        fault_injection: true,
      },
    });
    return;
  }

  let next = event;
  if (shouldCorruptPublish()) {
    next = {
      ...event,
      payload: {
        ...event.payload,
        corrupted: true,
        result: "CORRUPT",
        canonical: true, // deliberate corruption attempt — consumers must reject
      },
    };
  }

  log.push(next);
  for (const h of handlers.get(next.name) ?? []) h(next);
  for (const h of handlers.get("*") ?? []) h(next);
}

export function getEventLog(): readonly StaffEvent[] {
  return log;
}

export function hasEvent(
  name: StaffEventName,
  requestId: string
): boolean {
  return log.some((e) => e.name === name && e.request_id === requestId);
}

export function findEvent(
  name: StaffEventName,
  requestId: string
): StaffEvent | undefined {
  return log.find((e) => e.name === name && e.request_id === requestId);
}
