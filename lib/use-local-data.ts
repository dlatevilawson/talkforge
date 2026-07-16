"use client";

import { useSyncExternalStore } from "react";

/**
 * Read client-only localStorage-backed data without setState-in-effect.
 * Server snapshot keeps SSR/hydration stable.
 */
export function useLocalData<T>(getClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("talkforge:storage", handler as EventListener);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("talkforge:storage", handler as EventListener);
      };
    },
    getClientValue,
    () => serverValue
  );
}
