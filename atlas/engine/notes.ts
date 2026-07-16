import { getSupabaseClient } from "@/lib/supabase/client";
import type { FounderNote, NoteCategory } from "./ops-types";

export const NOTE_CATEGORIES: NoteCategory[] = [
  "Product",
  "Marketing",
  "Engineering",
  "Company",
  "Future Ideas",
];

const ATLAS_SYSTEM_USER_ID = "atlas-founder-os";
const NOTE_SCENARIO_ID = "atlas-founder-note";

const CATEGORY_RULES: Array<{ category: NoteCategory; patterns: RegExp[] }> = [
  {
    category: "Engineering",
    patterns: [
      /\b(bug|api|deploy|ci|github|typescript|react|next\.?js|supabase|schema|latency|crash|error|refactor|pr\b)/i,
    ],
  },
  {
    category: "Marketing",
    patterns: [
      /\b(marketing|launch|tweet|linkedin|audience|brand|growth|seo|content|campaign|positioning|waitlist)/i,
    ],
  },
  {
    category: "Future Ideas",
    patterns: [
      /\b(someday|future|idea|vision|roadmap|what if|eventually|moonshot|explore|experiment)/i,
    ],
  },
  {
    category: "Company",
    patterns: [
      /\b(company|hiring|founder|fundraising|legal|finance|mission|team|culture|ops|operating)/i,
    ],
  },
  {
    category: "Product",
    patterns: [
      /\b(product|ux|ui|coach|forge|practice|session|user|onboarding|retention|feature|mission)/i,
    ],
  },
];

/**
 * Categorize a founder note using keyword heuristics.
 * Defaults to Product when no stronger signal is present.
 */
export function categorizeFounderNote(body: string): NoteCategory {
  const text = body.trim();
  if (!text) return "Product";

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }

  return "Product";
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapNote(row: {
  id: string;
  body: string;
  category: string;
  created_at: string;
}): FounderNote {
  const category = NOTE_CATEGORIES.includes(row.category as NoteCategory)
    ? (row.category as NoteCategory)
    : "Product";

  return {
    id: row.id,
    body: row.body,
    category,
    createdAt: row.created_at,
  };
}

function isMissingTableError(error: { code?: string; message: string }): boolean {
  return (
    error.code === "PGRST205" ||
    error.message.includes("founder_notes") ||
    error.message.includes("schema cache")
  );
}

async function ensureAtlasSystemUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from("profiles").upsert({
    id: ATLAS_SYSTEM_USER_ID,
    display_name: "Atlas Founder OS",
    created_at: new Date().toISOString(),
  });
}

async function listNotesFallback(limit: number): Promise<FounderNote[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("id, scenario_title, mission_prompt, started_at")
    .eq("scenario_id", NOTE_SCENARIO_ID)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) =>
    mapNote({
      id: row.id,
      body: row.mission_prompt,
      category: row.scenario_title,
      created_at: row.started_at,
    })
  );
}

async function createNoteFallback(
  body: string,
  category: NoteCategory
): Promise<FounderNote> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  await ensureAtlasSystemUser();
  const id = createId("note");
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      id,
      user_id: ATLAS_SYSTEM_USER_ID,
      scenario_id: NOTE_SCENARIO_ID,
      scenario_title: category,
      mission_prompt: body,
      started_at: now,
      completed_at: now,
      average_score: null,
      turns: [],
    })
    .select("id, scenario_title, mission_prompt, started_at")
    .single();

  if (error) {
    throw new Error(`Failed to save founder note: ${error.message}`);
  }

  return mapNote({
    id: data.id,
    body: data.mission_prompt,
    category: data.scenario_title,
    created_at: data.started_at,
  });
}

export async function listFounderNotes(limit = 20): Promise<FounderNote[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("founder_notes")
    .select("id, body, category, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return listNotesFallback(limit);
    }
    throw new Error(`Failed to list founder notes: ${error.message}`);
  }

  return (data ?? []).map(mapNote);
}

export async function createFounderNote(body: string): Promise<FounderNote> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note body is required.");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const category = categorizeFounderNote(trimmed);
  const id = createId("note");

  const { data, error } = await supabase
    .from("founder_notes")
    .insert({
      id,
      body: trimmed,
      category,
    })
    .select("id, body, category, created_at")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return createNoteFallback(trimmed, category);
    }
    throw new Error(`Failed to save founder note: ${error.message}`);
  }

  return mapNote(data);
}
