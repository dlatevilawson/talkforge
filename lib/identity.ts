/**
 * Client-only pointer to the active TalkForge user id.
 * Authoritative identity is Supabase Auth; this cache must stay in sync.
 * Business data (profiles/sessions/reflections) lives in Supabase — not here.
 */

const CURRENT_USER_ID_KEY = "talkforge:currentUserId";
const PENDING_GUEST_ID_KEY = "talkforge:pendingGuestUserId";

/** Dispatched on window when the active user id is set or cleared. */
export const IDENTITY_CHANGED_EVENT = "talkforge:identity-changed";

function notifyIdentityChanged(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(IDENTITY_CHANGED_EVENT, { detail: { userId } })
    );
  } catch {
    // CustomEvent unavailable — ignore
  }
}

/** True for legacy guest ids (`guest_…`) that are not auth UUIDs. */
export function isGuestUserId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.startsWith("guest_");
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(CURRENT_USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUserId(id: string): void {
  if (typeof window === "undefined") return;
  const prior = getCurrentUserId();
  if (prior && prior !== id && isGuestUserId(prior)) {
    stashPendingGuestUserId(prior);
  }
  window.sessionStorage.setItem(CURRENT_USER_ID_KEY, id);
  if (prior !== id) {
    notifyIdentityChanged(id);
  }
}

/**
 * Bind the browser pointer to the authenticated Supabase user.
 * Replaces any guest session pointer and stashes the guest id for migration.
 */
export function bindAuthenticatedUserId(authUserId: string): void {
  setCurrentUserId(authUserId);
}

export function clearCurrentUserId(): void {
  if (typeof window === "undefined") return;
  const prior = getCurrentUserId();
  window.sessionStorage.removeItem(CURRENT_USER_ID_KEY);
  if (prior) {
    notifyIdentityChanged(null);
  }
}

export function stashPendingGuestUserId(guestId: string): void {
  if (typeof window === "undefined") return;
  if (!isGuestUserId(guestId)) return;
  try {
    window.localStorage.setItem(PENDING_GUEST_ID_KEY, guestId);
  } catch {
    // ignore quota / private mode
  }
}

export function getPendingGuestUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(PENDING_GUEST_ID_KEY);
    return isGuestUserId(id) ? id : null;
  } catch {
    return null;
  }
}

export function clearPendingGuestUserId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_GUEST_ID_KEY);
  } catch {
    // ignore
  }
}
