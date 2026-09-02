/**
 * Adaptive Homepage recommendation helpers.
 * One Coach next step. Alternatives stay secondary (CXA-001 / IV-REJ-005).
 */

export type HomeSessionHistory =
  | { status: "known"; completed: number }
  | { status: "unknown" };

export type HomeEntitlement =
  | { status: "open" }
  | { status: "limited" }
  | { status: "unknown" };

export type HomeAlternative = {
  id: string;
  title: string;
  blurb: string;
  practiceTitle: string;
  mode?: "assessment";
};

export type HomeAlternativeCatalog = {
  explorer: HomeAlternative;
  returning: readonly HomeAlternative[];
};

/** Explorer only when the count is known and zero — never on a failed read. */
export function isExplorerFromSessionHistory(
  history: HomeSessionHistory
): boolean {
  return history.status === "known" && history.completed === 0;
}

export function canStartTraining(entitlement: HomeEntitlement): boolean {
  return entitlement.status === "open";
}

/**
 * CXA alternatives after the recommendation — never the primary CTA.
 * Unknown session history: no alternatives (do not invent Explorer vs return).
 */
export function buildHomeAlternatives(
  history: HomeSessionHistory,
  catalog: HomeAlternativeCatalog
): HomeAlternative[] {
  if (history.status === "unknown") return [];
  if (isExplorerFromSessionHistory(history)) return [catalog.explorer];
  return catalog.returning.slice(0, 2);
}

export function practiceEntryHref(options: {
  title?: string;
  mode?: "assessment";
}): string {
  const params = new URLSearchParams({ start: "1" });
  const title = options.title?.trim() ?? "";
  if (title) params.set("title", title);
  if (options.mode === "assessment") params.set("mode", "assessment");
  return `/app/practice?${params.toString()}`;
}
