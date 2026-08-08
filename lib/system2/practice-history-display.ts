import type { PracticeSession } from "@/lib/types";

export function formatSessionWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function poiseLabel(score?: number | null): string | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score >= 80) return "Poise: High";
  if (score >= 60) return "Poise: Steady";
  return "Poise: Building";
}

/** Prefer real scenario titles; rename generic voice defaults. */
export function sessionDisplayTitle(session: PracticeSession): string {
  const title = session.scenarioTitle?.replace(/\s+/g, " ").trim() || "";
  const lower = title.toLowerCase();
  if (
    !title ||
    lower === "voice practice with forge" ||
    lower === "practice" ||
    lower === "hello" ||
    lower.startsWith("voice practice")
  ) {
    return session.modality === "voice"
      ? "Open Rehearsal"
      : "Unstructured Practice Rep";
  }
  if (
    lower.includes("what brings you") ||
    lower.includes("something on my mind") ||
    lower === "custom scenario"
  ) {
    return "Custom Scenario";
  }
  return title;
}
