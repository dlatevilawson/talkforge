export function notifyTalkForgeStorage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("talkforge:storage"));
}
