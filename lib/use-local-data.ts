"use client";

import { useRef } from "react";
import { useSyncExternalStore } from "react";

/**
 * Read client-only localStorage-backed data without setState-in-effect.
 * Server snapshot keeps SSR/hydration stable.
 */
export function useLocalData<T>(getClientValue: () => T, serverValue: T): T {
  const cachedSnapshot = useRef<T | undefined>(undefined);

  const getSnapshot = () => {
    const newValue = getClientValue();
    // Cache the snapshot to avoid infinite loop from new object references
    if (cachedSnapshot.current === undefined || JSON.stringify(cachedSnapshot.current) !== JSON.stringify(newValue)) {
      cachedSnapshot.current = newValue;
    }
    return cachedSnapshot.current;
  };

  return useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => {
        // Clear cache on storage change so next getSnapshot returns fresh value
        cachedSnapshot.current = undefined;
        onStoreChange();
      };
      window.addEventListener("storage", handler);
      window.addEventListener("talkforge:storage", handler as EventListener);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("talkforge:storage", handler as EventListener);
      };
    },
    getSnapshot,
    () => serverValue
  );
}
