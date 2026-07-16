import OpenAI from "openai";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CompanyHealth,
  DailyFounderBrief,
  FounderMetrics,
  MissionControl,
  NextAction,
} from "./ops-types";

const ATLAS_SYSTEM_USER_ID = "atlas-founder-os";
const BRIEF_SCENARIO_ID = "atlas-founder-brief";

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function buildDeterministicBrief(input: {
  missionControl: MissionControl;
  companyHealth: CompanyHealth;
  founderMetrics: FounderMetrics;
  nextAction: NextAction;
}): DailyFounderBrief {
  const { missionControl, companyHealth, founderMetrics, nextAction } = input;
  const top = missionControl.topPriority;
  const priorities = [
    nextAction.title,
    top && top.title !== nextAction.title
      ? top.title
      : missionControl.todayMission.title,
    companyHealth.openBugCount > 0
      ? `Clear open bugs (${companyHealth.openBugCount})`
      : "Raise coaching quality without expanding scope",
  ].slice(0, 3);

  const summary = [
    `Sprint ${missionControl.sprint.name}: ${missionControl.sprint.goal}`,
    `Today: ${missionControl.todayMission.title}.`,
    `Milestone ${missionControl.milestone.id} at ${missionControl.milestone.progress}% — ${missionControl.milestone.title}.`,
    `Product: ${founderMetrics.practiceSessions} practice sessions, avg score ${founderMetrics.averageCoachingScore}, ${founderMetrics.users} users (${founderMetrics.growth.label}; ${founderMetrics.retention.label}).`,
    `Systems: DB ${companyHealth.database.reachable ? "reachable" : "down"}, GitHub ${companyHealth.github.available ? "live" : "degraded"}, AI est. $${companyHealth.aiCost.estimatedCostUsd.toFixed(2)}, deploy ${companyHealth.deployment.status}.`,
    `Next move: ${nextAction.title}.`,
  ].join(" ");

  return {
    date: todayKey(),
    summary,
    priorities,
    generatedAt: new Date().toISOString(),
    source: "deterministic",
  };
}

function isMissingTableError(error: { code?: string; message: string }): boolean {
  return (
    error.code === "PGRST205" ||
    error.message.includes("founder_briefs") ||
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

async function loadCachedBrief(date: string): Promise<DailyFounderBrief | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("founder_briefs")
    .select("id, summary, priorities, generated_at, source")
    .eq("id", date)
    .maybeSingle();

  if (!error && data) {
    const priorities = Array.isArray(data.priorities)
      ? (data.priorities as string[])
      : [];
    return {
      date: data.id,
      summary: data.summary,
      priorities,
      generatedAt: data.generated_at,
      source: data.source === "openai" ? "openai" : "deterministic",
    };
  }

  if (error && !isMissingTableError(error)) {
    return null;
  }

  // Fallback: practice_sessions row with scenario atlas-founder-brief
  const fallback = await supabase
    .from("practice_sessions")
    .select("id, scenario_title, mission_prompt, started_at, turns")
    .eq("id", `brief_${date}`)
    .eq("scenario_id", BRIEF_SCENARIO_ID)
    .maybeSingle();

  if (fallback.error || !fallback.data) return null;

  const turns = Array.isArray(fallback.data.turns) ? fallback.data.turns : [];
  const prioritiesTurn = turns.find(
    (turn) =>
      typeof turn === "object" &&
      turn !== null &&
      "role" in turn &&
      (turn as { role?: string }).role === "npc"
  ) as { text?: string } | undefined;

  let priorities: string[] = [];
  try {
    priorities = JSON.parse(prioritiesTurn?.text ?? "[]") as string[];
  } catch {
    priorities = [];
  }

  return {
    date,
    summary: fallback.data.mission_prompt,
    priorities,
    generatedAt: fallback.data.started_at,
    source:
      fallback.data.scenario_title === "openai" ? "openai" : "deterministic",
  };
}

async function cacheBrief(brief: DailyFounderBrief): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("founder_briefs").upsert({
    id: brief.date,
    summary: brief.summary,
    priorities: brief.priorities,
    generated_at: brief.generatedAt,
    source: brief.source,
  });

  if (!error) return;
  if (!isMissingTableError(error)) return;

  await ensureAtlasSystemUser();
  await supabase.from("practice_sessions").upsert({
    id: `brief_${brief.date}`,
    user_id: ATLAS_SYSTEM_USER_ID,
    scenario_id: BRIEF_SCENARIO_ID,
    scenario_title: brief.source,
    mission_prompt: brief.summary,
    started_at: brief.generatedAt,
    completed_at: brief.generatedAt,
    average_score: null,
    turns: [
      {
        role: "npc",
        text: JSON.stringify(brief.priorities),
      },
    ],
  });
}

async function generateOpenAiBrief(input: {
  missionControl: MissionControl;
  companyHealth: CompanyHealth;
  founderMetrics: FounderMetrics;
  nextAction: NextAction;
}): Promise<DailyFounderBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  try {
    const request = client.responses.create({
      model: "gpt-5",
      instructions:
        "You are Atlas, Chief of Staff of TalkForge. Write a concise Daily Founder Brief. Return ONLY valid JSON with keys summary (string, 3-5 sentences) and priorities (array of exactly 3 short action strings). No markdown.",
      input: [
        {
          role: "user",
          content: JSON.stringify({
            date: todayKey(),
            missionControl: input.missionControl,
            companyHealth: {
              productSummary: input.companyHealth.productHealth.summary,
              openBugs: input.companyHealth.openBugCount,
              database: input.companyHealth.database.message,
              github: input.companyHealth.github.message,
              aiCost: input.companyHealth.aiCost.message,
              deployment: input.companyHealth.deployment.message,
            },
            founderMetrics: input.founderMetrics,
            nextAction: input.nextAction,
          }),
        },
      ],
    });

    const response = await Promise.race([
      request,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 4500);
      }),
    ]);

    if (!response) return null;

    const text = response.output_text?.trim();
    if (!text) return null;

    const jsonText = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      priorities?: string[];
    };

    if (!parsed.summary || !Array.isArray(parsed.priorities)) {
      return null;
    }

    return {
      date: todayKey(),
      summary: parsed.summary.trim(),
      priorities: parsed.priorities.map((item) => String(item).trim()).slice(0, 3),
      generatedAt: new Date().toISOString(),
      source: "openai",
    };
  } catch {
    return null;
  }
}

/**
 * Load today's Daily Founder Brief (cached in Supabase when available),
 * otherwise generate from live company state.
 */
export async function loadDailyFounderBrief(input: {
  missionControl: MissionControl;
  companyHealth: CompanyHealth;
  founderMetrics: FounderMetrics;
  nextAction: NextAction;
  forceRefresh?: boolean;
}): Promise<DailyFounderBrief> {
  const date = todayKey();

  if (!input.forceRefresh) {
    const cached = await loadCachedBrief(date);
    if (cached && cached.priorities.length >= 3) {
      return cached;
    }
  }

  const openaiBrief = await generateOpenAiBrief(input);
  const brief = openaiBrief ?? buildDeterministicBrief(input);

  const priorities = [...brief.priorities];
  while (priorities.length < 3) {
    priorities.push(input.nextAction.title);
  }
  brief.priorities = priorities.slice(0, 3);

  await cacheBrief(brief);
  return brief;
}
