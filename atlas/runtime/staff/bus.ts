import type { StaffEvent, StaffEventName } from "./events";

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
  log.push(event);
  for (const h of handlers.get(event.name) ?? []) h(event);
  for (const h of handlers.get("*") ?? []) h(event);
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
