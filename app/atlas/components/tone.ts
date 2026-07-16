import type { HealthTone, Severity } from "@/atlas/engine/ops-types";

export function toneClasses(tone: HealthTone): string {
  switch (tone) {
    case "good":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    case "warn":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "bad":
      return "border-red-500/25 bg-red-500/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

export function toneDot(tone: HealthTone): string {
  switch (tone) {
    case "good":
      return "bg-emerald-400";
    case "warn":
      return "bg-amber-400";
    case "bad":
      return "bg-red-400";
    default:
      return "bg-zinc-500";
  }
}

export function severityClasses(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "text-red-300";
    case "high":
      return "text-orange-300";
    case "medium":
      return "text-amber-200";
    case "low":
      return "text-zinc-400";
  }
}

export function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
