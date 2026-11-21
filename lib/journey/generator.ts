import type { Drill, DrillPhase, DrillSignal } from "@/lib/drills/catalog";

export type GeneratedDay = {
  dayIndex: number;
  date: string;
  drillId: string;
  fieldAssignmentText: string;
};

const SIGNALS: DrillSignal[] = ["purpose", "perspective", "composure", "message", "adaptability"];
const PHASES: DrillPhase[] = ["recognise", "build", "rehearse", "roleplay"];

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function planEndDate(kind: "6_week" | "6_month", startsOn: string): string {
  return addDays(startsOn, kind === "6_week" ? 41 : 181);
}

export function chooseBlockDrills(
  drills: Drill[],
  focusSignal: DrillSignal,
  occasionText = "",
): Drill[] {
  const active = drills.filter((drill) => drill.modality !== "field");
  const occasion = occasionText.toLowerCase();
  const ranked = [...active].sort((a, b) => {
    const aPhase = a.phase ? PHASES.indexOf(a.phase) : PHASES.length;
    const bPhase = b.phase ? PHASES.indexOf(b.phase) : PHASES.length;
    if (aPhase !== bPhase) return aPhase - bPhase;
    const aOccasion = occasion && a.scenarioTags.some((tag) => occasion.includes(tag)) ? 1 : 0;
    const bOccasion = occasion && b.scenarioTags.some((tag) => occasion.includes(tag)) ? 1 : 0;
    return bOccasion - aOccasion || a.difficulty - b.difficulty || a.id.localeCompare(b.id);
  });
  if (ranked.length === 0) throw new Error("No active drills available");
  const bySignal = (signal: DrillSignal) => ranked.filter((drill) => drill.signal === signal);
  const focus = bySignal(focusSignal);
  if (focus.length === 0) throw new Error(`No active drills for focus signal ${focusSignal}`);
  const selectedBySignal = new Map<DrillSignal, Set<string>>();
  const remember = (drill: Drill) => {
    const seen = selectedBySignal.get(drill.signal) ?? new Set<string>();
    seen.add(drill.id);
    selectedBySignal.set(drill.signal, seen);
  };
  // The first week is a discovery week, not a two-drill loop. Use distinct
  // library rows before any repetition. Within each skill, its distinct drills
  // are offered in phase order; the focus signal still leads the discovery week.
  const selected: Drill[] = [];
  const used = new Set<string>();
  const addFirstWeek = (pool: Drill[]) => {
    for (const drill of pool) {
      if (selected.length >= 7 || used.has(drill.id)) continue;
      selected.push(drill);
      used.add(drill.id);
      remember(drill);
    }
  };
  addFirstWeek(focus);
  addFirstWeek(ranked.filter((drill) => drill.signal !== focusSignal));
  addFirstWeek(ranked);
  // Small test/preview catalogs may contain fewer than seven rows. Keep the
  // block shape intact there; production's full seeded library takes the
  // distinct path above.
  while (selected.length < 7) {
    const previous = selected.at(-1);
    const candidate = ranked.find((drill) => !used.has(drill.id))
      ?? ranked.find((drill) => drill.id !== previous?.id)
      ?? ranked[0];
    selected.push(candidate);
    used.add(candidate.id);
    remember(candidate);
  }

  for (let index = 7; index < 14; index += 1) {
    const signal = SIGNALS[(SIGNALS.indexOf(focusSignal) + index) % SIGNALS.length];
    const pool = bySignal(signal).length ? bySignal(signal) : ranked;
    const previous = selected.at(-1);
    const seenForSignal = selectedBySignal.get(signal) ?? new Set<string>();
    const candidate = pool.find((drill) => !seenForSignal.has(drill.id) && drill.id !== previous?.id)
      ?? pool.find((drill) => !seenForSignal.has(drill.id))
      ?? pool.find((drill) => drill.id !== previous?.id)
      ?? ranked.find((drill) => drill.id !== previous?.id)
      ?? ranked[0];
    selected.push(candidate);
    remember(candidate);
  }
  return selected;
}

export function generateBlockDays(input: {
  startDate: string;
  focusSignal: DrillSignal;
  drills: Drill[];
  occasionText?: string;
  voiceSlots?: number;
}): GeneratedDay[] {
  const selected = chooseBlockDrills(input.drills, input.focusSignal, input.occasionText);
  const voiceSlots = input.voiceSlots ?? Number.POSITIVE_INFINITY;
  let voiceUsed = 0;
  const nonVoice = input.drills.filter((drill) => drill.modality !== "voice");
  return selected.map((drill, index) => ({
    dayIndex: index + 1,
    date: addDays(input.startDate, index),
    drillId: (() => {
      if (drill.modality !== "voice") return drill.id;
      if (voiceUsed < voiceSlots) { voiceUsed += 1; return drill.id; }
      const replacement = nonVoice[index % Math.max(1, nonVoice.length)];
      return replacement?.id ?? drill.id;
    })(),
    fieldAssignmentText: `Use one ${drill.name.toLowerCase()} rep in a real conversation, then note what happened.`,
  }));
}

