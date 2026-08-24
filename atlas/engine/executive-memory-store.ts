/**
 * Operational Executive Memory sink.
 * Uses existing practice_sessions rows tagged atlas-founder-* (excluded from practice lists).
 * Never writes Constitution, Decisions, Living Profile, or REG-PROMO-Q as Canonical.
 */

import { persistDisposition } from "@/atlas/runtime/retention/store";
import type { ExecutiveMemoryRecord } from "./executive-memory";
import {
  assertNeverCanonical,
  classifySittingClose,
  newSittingId,
} from "./executive-memory";
import type { AtlasThreadTurn } from "./thread";
import { getFounderAuthUserId, getFounderSupabase } from "./supabase";

export const EXECUTIVE_MEMORY_SCENARIO_ID = "atlas-founder-executive-memory";

const memory: ExecutiveMemoryRecord[] = [];

export function resetExecutiveMemoryForTests(): void {
  memory.length = 0;
}

export function listExecutiveMemoryMemory(): ExecutiveMemoryRecord[] {
  return [...memory];
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `em_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseRecord(row: {
  id: string;
  mission_prompt: string | null;
  started_at: string;
}): ExecutiveMemoryRecord | null {
  if (!row.mission_prompt) return null;
  try {
    const parsed = JSON.parse(row.mission_prompt) as ExecutiveMemoryRecord;
    if (parsed.canonical !== false) return null;
    if (!parsed.class || !parsed.kind || !parsed.summary) return null;
    return {
      ...parsed,
      id: row.id,
      stored_at: parsed.stored_at || row.started_at,
      canonical: false,
    };
  } catch {
    return null;
  }
}

export async function listExecutiveMemory(
  limit = 40
): Promise<ExecutiveMemoryRecord[]> {
  const supabase = await getFounderSupabase();
  if (!supabase) {
    return memory.slice(-limit).reverse();
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("id, mission_prompt, started_at")
    .eq("scenario_id", EXECUTIVE_MEMORY_SCENARIO_ID)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return memory.slice(-limit).reverse();
  }

  return data
    .map(parseRecord)
    .filter((row): row is ExecutiveMemoryRecord => row !== null);
}

export async function persistExecutiveMemoryRecords(
  records: ExecutiveMemoryRecord[]
): Promise<ExecutiveMemoryRecord[]> {
  assertNeverCanonical(records);
  if (records.length === 0) return [];

  const stored = records.map((record) => ({
    ...record,
    id: createId(),
    canonical: false as const,
  }));

  for (const record of stored) {
    persistDisposition({
      request_id: record.sitting_id,
      class: record.class,
      summary: record.summary,
      refs: [
        record.provenance.source,
        `turn:${record.provenance.turn_index}`,
        record.kind,
      ],
      canonical: false,
    });
    memory.push(record);
  }

  const supabase = await getFounderSupabase();
  if (!supabase) return stored;

  const userId = await getFounderAuthUserId(supabase);
  if (!userId) return stored;

  const rows = stored.map((record) => ({
    id: record.id,
    user_id: userId,
    scenario_id: EXECUTIVE_MEMORY_SCENARIO_ID,
    scenario_title: `${record.class}:${record.kind}`,
    mission_prompt: JSON.stringify({ ...record, canonical: false }),
    started_at: record.stored_at,
    completed_at: record.stored_at,
    average_score: null,
    turns: [],
  }));

  const { error } = await supabase.from("practice_sessions").insert(rows);
  if (error) {
    throw new Error(`Failed to store Executive Memory: ${error.message}`);
  }

  return stored;
}

export async function closeAskAtlasSitting(
  thread: AtlasThreadTurn[],
  sittingId = newSittingId()
): Promise<{ sitting_id: string; records: ExecutiveMemoryRecord[] }> {
  const records = classifySittingClose(thread, sittingId);
  const stored = await persistExecutiveMemoryRecords(records);
  return { sitting_id: sittingId, records: stored };
}
