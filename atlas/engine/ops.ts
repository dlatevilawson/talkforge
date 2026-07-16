import { readFile } from "fs/promises";
import path from "path";
import { getSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabase/client";
import type { ConversationTurn, PracticeSession } from "@/lib/types";
import type {
  AiUsage,
  DatabaseStatus,
  FounderOpsSnapshot,
  GithubActivityItem,
  GithubStatus,
  NextAction,
  OpsStateFile,
  ProductHealth,
  RecentSessionRow,
  Severity,
} from "./ops-types";

const OPS_STATE_PATH = path.join(process.cwd(), "atlas", "ops", "state.json");
const DEFAULT_REPO = "dlatevilawson/talkforge";

async function loadOpsState(): Promise<OpsStateFile> {
  const raw = await readFile(OPS_STATE_PATH, "utf8");
  return JSON.parse(raw) as OpsStateFile;
}

function countForgeTurns(turns: ConversationTurn[]): number {
  return turns.filter((turn) => turn.role === "forge").length;
}

async function loadPracticeSessions(): Promise<PracticeSession[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("practice_sessions")
    .select(
      "id, user_id, scenario_id, scenario_title, mission_prompt, started_at, completed_at, average_score, turns"
    )
    .order("started_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    missionPrompt: row.mission_prompt,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    averageScore: row.average_score ?? undefined,
    turns: Array.isArray(row.turns) ? (row.turns as ConversationTurn[]) : [],
  }));
}

async function loadReflectionCount(): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("reflections")
    .select("session_id", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

async function loadProfileCount(): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) return null;
  return count ?? 0;
}

async function pingDatabase(): Promise<DatabaseStatus> {
  const config = getSupabaseConfigStatus();
  if (!config.configured) {
    return {
      configured: false,
      reachable: false,
      backend: "unconfigured",
      profileCount: null,
      message: config.message,
      tone: "bad",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      configured: false,
      reachable: false,
      backend: "unconfigured",
      profileCount: null,
      message: "Supabase client could not be created.",
      tone: "bad",
    };
  }

  const { error } = await supabase.from("profiles").select("id").limit(1);
  const profileCount = await loadProfileCount();

  if (error) {
    return {
      configured: true,
      reachable: false,
      backend: "supabase",
      profileCount,
      message: `Supabase configured but query failed: ${error.message}`,
      tone: "bad",
    };
  }

  return {
    configured: true,
    reachable: true,
    backend: "supabase",
    profileCount,
    message: `Supabase reachable · ${profileCount ?? 0} profiles`,
    tone: "good",
  };
}

function buildProductHealth(
  sessions: PracticeSession[],
  reflectionsSaved: number
): ProductHealth {
  const completed = sessions.filter((session) => session.completedAt);
  const scored = completed.filter(
    (session) => typeof session.averageScore === "number"
  );
  const averageScore =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, session) => sum + (session.averageScore ?? 0), 0) /
            scored.length
        );
  const uniqueUsers = new Set(sessions.map((session) => session.userId)).size;
  const latest = completed[0] ?? sessions[0] ?? null;

  let tone: ProductHealth["tone"] = "neutral";
  let summary = "No practice data yet. Run the loop.";

  if (completed.length === 0 && sessions.length === 0) {
    tone = "warn";
    summary = "No sessions in Supabase yet. Verify the product loop.";
  } else if (completed.length === 0) {
    tone = "warn";
    summary = "Sessions started but none completed. Finish a mission.";
  } else if (averageScore >= 70 && reflectionsSaved > 0) {
    tone = "good";
    summary = "Loop is producing completed, scored, reflected practice.";
  } else if (averageScore < 55) {
    tone = "warn";
    summary = "Completed sessions exist, but coaching scores are soft.";
  } else {
    tone = "good";
    summary = "Practice volume is live. Keep raising quality and retention.";
  }

  return {
    sessionsCompleted: completed.length,
    sessionsTotal: sessions.length,
    averageScore,
    reflectionsSaved,
    lastSessionAt: latest?.completedAt ?? latest?.startedAt ?? null,
    lastScenarioTitle: latest?.scenarioTitle ?? null,
    uniqueUsers,
    tone,
    summary,
  };
}

function buildAiUsage(sessions: PracticeSession[]): AiUsage {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const recent = sessions.slice(0, 20);
  let forgeTurnsRecent = 0;
  let sessionsWithCoaching = 0;
  const scores: number[] = [];

  for (const session of recent) {
    const forgeTurns = countForgeTurns(session.turns);
    forgeTurnsRecent += forgeTurns;
    if (forgeTurns > 0) sessionsWithCoaching += 1;
    if (typeof session.averageScore === "number") {
      scores.push(session.averageScore);
    }
  }

  const averageCoachScore =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  if (!openaiConfigured) {
    return {
      openaiConfigured: false,
      forgeTurnsRecent,
      sessionsWithCoaching,
      averageCoachScore,
      message: "OPENAI_API_KEY missing. Forge and Atlas chat are unavailable.",
      tone: "bad",
    };
  }

  return {
    openaiConfigured: true,
    forgeTurnsRecent,
    sessionsWithCoaching,
    averageCoachScore,
    message:
      forgeTurnsRecent === 0
        ? "OpenAI ready. No recent Forge coaching turns yet."
        : `${forgeTurnsRecent} Forge turns across ${sessionsWithCoaching} recent sessions.`,
    tone: forgeTurnsRecent > 0 ? "good" : "warn",
  };
}

function toRecentRows(sessions: PracticeSession[]): RecentSessionRow[] {
  return sessions.slice(0, 8).map((session) => ({
    id: session.id,
    scenarioTitle: session.scenarioTitle,
    startedAt: session.startedAt,
    completedAt: session.completedAt ?? null,
    averageScore: session.averageScore ?? null,
    turnCount: session.turns.length,
    userId: session.userId,
  }));
}

async function loadGithubActivity(): Promise<GithubStatus> {
  const repo =
    process.env.GITHUB_REPO?.trim() ||
    process.env.NEXT_PUBLIC_GITHUB_REPO?.trim() ||
    DEFAULT_REPO;
  const token = process.env.GITHUB_TOKEN?.trim();

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "talkforge-atlas",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const [commitsRes, pullsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, {
        headers,
        next: { revalidate: 60 },
      }),
      fetch(
        `https://api.github.com/repos/${repo}/pulls?state=open&per_page=5&sort=updated`,
        {
          headers,
          next: { revalidate: 60 },
        }
      ),
    ]);

    if (!commitsRes.ok && !pullsRes.ok) {
      return {
        available: false,
        repo,
        message: `GitHub unavailable (${commitsRes.status}).`,
        items: [],
        tone: "warn",
      };
    }

    const items: GithubActivityItem[] = [];

    if (pullsRes.ok) {
      const pulls = (await pullsRes.json()) as Array<{
        id: number;
        title: string;
        html_url: string;
        user?: { login?: string };
        updated_at: string;
      }>;
      for (const pull of pulls.slice(0, 3)) {
        items.push({
          id: `pr-${pull.id}`,
          kind: "pull_request",
          title: pull.title,
          url: pull.html_url,
          author: pull.user?.login ?? null,
          at: pull.updated_at,
        });
      }
    }

    if (commitsRes.ok) {
      const commits = (await commitsRes.json()) as Array<{
        sha: string;
        html_url: string;
        commit: {
          message: string;
          author?: { name?: string; date?: string };
        };
        author?: { login?: string } | null;
      }>;
      for (const commit of commits.slice(0, 5)) {
        items.push({
          id: commit.sha,
          kind: "commit",
          title: commit.commit.message.split("\n")[0] ?? commit.sha.slice(0, 7),
          url: commit.html_url,
          author: commit.author?.login ?? commit.commit.author?.name ?? null,
          at: commit.commit.author?.date ?? new Date().toISOString(),
        });
      }
    }

    items.sort((a, b) => b.at.localeCompare(a.at));

    return {
      available: true,
      repo,
      message: items.length
        ? `${items.length} recent events from ${repo}`
        : `Connected to ${repo}, no recent events.`,
      items: items.slice(0, 8),
      tone: items.length ? "good" : "neutral",
    };
  } catch {
    return {
      available: false,
      repo,
      message: "Could not reach GitHub.",
      items: [],
      tone: "warn",
    };
  }
}

function severityRank(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
  }
}

function decideNextAction(input: {
  state: OpsStateFile;
  database: DatabaseStatus;
  aiUsage: AiUsage;
  productHealth: ProductHealth;
}): NextAction {
  const { state, database, aiUsage, productHealth } = input;

  const criticalBug = [...state.bugs]
    .filter((bug) => bug.status === "open" || bug.status === "in_progress")
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))[0];

  if (!database.configured || !database.reachable) {
    return {
      title: "Restore Supabase connectivity",
      reason: database.message,
      href: "/profile",
      cta: "Check persistence",
      urgency: "critical",
    };
  }

  if (!aiUsage.openaiConfigured) {
    return {
      title: "Configure OpenAI for Forge and Atlas",
      reason: aiUsage.message,
      href: "/training",
      cta: "Open practice",
      urgency: "critical",
    };
  }

  if (criticalBug && (criticalBug.severity === "critical" || criticalBug.severity === "high")) {
    return {
      title: `Clear ${criticalBug.id}: ${criticalBug.title}`,
      reason: criticalBug.detail,
      href: "/atlas",
      cta: "Review open bugs",
      urgency: criticalBug.severity,
    };
  }

  if (productHealth.sessionsCompleted === 0) {
    return {
      title: "Complete one practice session end-to-end",
      reason:
        "Atlas has no completed sessions to judge product health. Prove the loop before expanding scope.",
      href: "/training",
      cta: "Start practicing",
      urgency: "high",
    };
  }

  const topPriority =
    state.priorities.find((item) => item.status !== "done") ??
    state.priorities[0];

  if (topPriority) {
    return {
      title: topPriority.title,
      reason: `${topPriority.detail} Sprint ${state.sprint.id}: ${state.sprint.goal}`,
      href: topPriority.rank <= 2 ? "/training" : "/dashboard",
      cta: topPriority.rank <= 2 ? "Inspect the loop" : "Open dashboard",
      urgency: topPriority.rank === 1 ? "high" : "medium",
    };
  }

  return {
    title: "Advance Sprint 001",
    reason: state.sprint.goal,
    href: "/dashboard",
    cta: "Review product",
    urgency: "medium",
  };
}

/**
 * Aggregate institutional ops state with live product, database, AI, and GitHub signals.
 */
export async function loadFounderOpsSnapshot(): Promise<FounderOpsSnapshot> {
  const [state, sessions, reflectionsSaved, database, github] =
    await Promise.all([
      loadOpsState(),
      loadPracticeSessions(),
      loadReflectionCount(),
      pingDatabase(),
      loadGithubActivity(),
    ]);

  const productHealth = buildProductHealth(sessions, reflectionsSaved);
  const aiUsage = buildAiUsage(sessions);
  const recentSessions = toRecentRows(sessions);
  const openBugs = state.bugs.filter(
    (bug) => bug.status === "open" || bug.status === "in_progress"
  );
  const nextAction = decideNextAction({
    state,
    database,
    aiUsage,
    productHealth,
  });

  return {
    generatedAt: new Date().toISOString(),
    sprint: state.sprint,
    priorities: [...state.priorities].sort((a, b) => a.rank - b.rank),
    bugs: [...openBugs].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity)
    ),
    openBugCount: openBugs.length,
    productHealth,
    database,
    aiUsage,
    recentSessions,
    github,
    quickActions: state.quickActions,
    nextAction,
  };
}
