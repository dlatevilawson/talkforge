"use client";

import { useCallback, useRef } from "react";
import { useSyncExternalStore } from "react";
import { withStorageNotificationsSuppressed } from "./storage-events";

/**
 * Read client-only localStorage-backed data without setState-in-effect.
 * Snapshot reads are notification-suppressed so accidental writes inside
 * getters cannot re-enter useSyncExternalStore and freeze the app.
 */
export function useLocalData<T>(getClientValue: () => T, serverValue: T): T {
  const cachedSnapshot = useRef<{ raw: string; value: T } | undefined>(
    undefined
  );

  const getSnapshot = useCallback(() => {
    const newValue = withStorageNotificationsSuppressed(() => getClientValue());
    const raw = JSON.stringify(newValue);

    if (cachedSnapshot.current?.raw === raw) {
      return cachedSnapshot.current.value;
    }

    cachedSnapshot.current = { raw, value: newValue };
    return newValue;
  }, [getClientValue]);

  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => {
        cachedSnapshot.current = undefined;
        onStoreChange();
      };
      window.addEventListener("storage", handler);
      window.addEventListener("talkforge:storage", handler as EventListener);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(
          "talkforge:storage",
          handler as EventListener
        );
      };
    },
    getSnapshot,
    getServerSnapshot
  );
}
