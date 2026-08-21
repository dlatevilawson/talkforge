/**
 * IV-AI-008 — Atlas Awareness Steward.
 * Atlas is first to know. Engineering owns the fix.
 * Ops-labeled only — never Identity, never Canonical.
 */
import type {
  AiUsage,
  AwarenessSignal,
  BugItem,
  CompanyHealth,
  DatabaseStatus,
  GithubStatus,
  NextAction,
  ProductHealth,
} from "./ops-types";

export type AwarenessInput = {
  productHealth: ProductHealth;
  database: DatabaseStatus;
  github: GithubStatus;
  aiUsage: AiUsage;
  openBugs: BugItem[];
  nextAction: NextAction;
  deploymentStatus: CompanyHealth["deployment"]["status"];
};

const OWNER = "engineering" as const;

export function collectAwarenessSignals(
  input: AwarenessInput
): AwarenessSignal[] {
  const signals: AwarenessSignal[] = [];

  if (!input.database.configured || !input.database.reachable) {
    signals.push({
      id: "systems-database",
      severity: "critical",
      fact: input.database.message || "Database is not reachable.",
      domain: "systems",
      owner: OWNER,
    });
  }

  if (!input.aiUsage.openaiConfigured) {
    signals.push({
      id: "systems-openai",
      severity: "critical",
      fact: "OpenAI is not configured — Forge cannot coach.",
      domain: "systems",
      owner: OWNER,
    });
  }

  if (input.deploymentStatus === "degraded") {
    signals.push({
      id: "systems-deploy",
      severity: "warn",
      fact: "Deployment is degraded.",
      domain: "systems",
      owner: OWNER,
    });
  }

  if (!input.github.available) {
    signals.push({
      id: "systems-github",
      severity: "warn",
      fact: input.github.message || "GitHub is unavailable.",
      domain: "systems",
      owner: OWNER,
    });
  }

  if (
    input.productHealth.tone === "bad" ||
    input.productHealth.tone === "warn"
  ) {
    signals.push({
      id: "product-health",
      severity: input.productHealth.tone === "bad" ? "critical" : "warn",
      fact: input.productHealth.summary,
      domain: "product",
      owner: OWNER,
    });
  }

  const severeBugs = input.openBugs.filter(
    (bug) => bug.severity === "critical" || bug.severity === "high"
  );
  if (severeBugs.length > 0) {
    const titles = severeBugs
      .slice(0, 2)
      .map((bug) => `${bug.id}: ${bug.title}`)
      .join("; ");
    signals.push({
      id: "engineering-bugs",
      severity: severeBugs.some((bug) => bug.severity === "critical")
        ? "critical"
        : "warn",
      fact: `${severeBugs.length} high-severity open bug${
        severeBugs.length === 1 ? "" : "s"
      }. ${titles}`,
      domain: "engineering",
      owner: OWNER,
    });
  }

  if (
    input.nextAction.urgency === "critical" ||
    input.nextAction.urgency === "high"
  ) {
    const already = signals.some((signal) =>
      signal.fact.includes(input.nextAction.title)
    );
    if (!already) {
      signals.push({
        id: "next-action",
        severity: input.nextAction.urgency === "critical" ? "critical" : "warn",
        fact: `${input.nextAction.title} — ${input.nextAction.reason}`,
        domain: "product",
        owner: OWNER,
      });
    }
  }

  const rank = { critical: 0, warn: 1, info: 2 };
  return signals.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function awarenessBriefLine(signals: AwarenessSignal[]): string {
  const top = signals.find(
    (signal) => signal.severity === "critical" || signal.severity === "warn"
  );
  if (!top) {
    return "Awareness: no material imbalances detected. Atlas notifies — engineering owns remediation.";
  }
  return `Awareness (${top.severity}): ${top.fact} Atlas notifies — engineering owns remediation.`;
}
