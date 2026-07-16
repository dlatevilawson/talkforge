let suppressStorageNotifications = 0;

export function withStorageNotificationsSuppressed<T>(fn: () => T): T {
  suppressStorageNotifications += 1;
  try {
    return fn();
  } finally {
    suppressStorageNotifications -= 1;
  }
}

export function notifyTalkForgeStorage(): void {
  if (typeof window === "undefined") return;
  if (suppressStorageNotifications > 0) return;
  window.dispatchEvent(new Event("talkforge:storage"));
}
