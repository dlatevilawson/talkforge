export function queueShadowReadinessEvaluation(sessionId: string): void {
  if (typeof window === "undefined" || !sessionId) return;
  void fetch("/api/readiness/shadow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Shadow evaluation must never alter or interrupt the member experience.
  });
}
