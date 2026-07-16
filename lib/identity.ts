/**
 * Client-only pointer to the current guest profile id.
 * Business data (profiles/sessions/reflections) lives in Supabase — not here.
 */
const CURRENT_USER_ID_KEY = "talkforge:currentUserId";

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
  window.sessionStorage.setItem(CURRENT_USER_ID_KEY, id);
}

export function clearCurrentUserId(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CURRENT_USER_ID_KEY);
}
