import type {
  CoachMemory,
  LifeCommitment,
  LifeMilestone,
  SessionReport,
} from "@/lib/coach/types";

export type LifeCompass = {
  northStar: string;
  relationships: string;
  learning: string;
  health: string;
  lifeVision: string;
  personTheyWantToBecome: string;
  careerGoals: string[];
  familyGoals: string[];
  healthGoals: string[];
  businessGoals: string[];
  learningGoals: string[];
  milestones: LifeMilestone[];
  openCommitments: LifeCommitment[];
  hasAny: boolean;
};

export type DriftSignal = {
  theme: string;
  sessionCount: number;
  northStar: string;
  askHint: string;
};

export type PurposePromptHints = {
  purposeOpening: string | null;
  commitmentFollowUp: string | null;
  milestoneFollowUp: string | null;
  driftAsk: string | null;
  visionCheck: string | null;
};

function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPurposeFields(): Pick<
  CoachMemory,
  | "northStar"
  | "lifeVision"
  | "personTheyWantToBecome"
  | "compassRelationships"
  | "compassLearning"
  | "compassHealth"
  | "careerGoals"
  | "familyGoals"
  | "healthGoals"
  | "businessGoals"
  | "learningGoals"
  | "lifeMilestones"
  | "commitments"
  | "lastVisionCheckAt"
> {
  return {
    northStar: "",
    lifeVision: "",
    personTheyWantToBecome: "",
    compassRelationships: "",
    compassLearning: "",
    compassHealth: "",
    careerGoals: [],
    familyGoals: [],
    healthGoals: [],
    businessGoals: [],
    learningGoals: [],
    lifeMilestones: [],
    commitments: [],
    lastVisionCheckAt: null,
  };
}

export function buildLifeCompass(memory: CoachMemory | null): LifeCompass {
  const m = memory;
  const northStar = m?.northStar?.trim() || "";
  const relationships = m?.compassRelationships?.trim() || "";
  const learning = m?.compassLearning?.trim() || "";
  const health = m?.compassHealth?.trim() || "";
  const lifeVision = m?.lifeVision?.trim() || "";
  const personTheyWantToBecome = m?.personTheyWantToBecome?.trim() || "";
  const careerGoals = m?.careerGoals ?? [];
  const familyGoals = m?.familyGoals ?? [];
  const healthGoals = m?.healthGoals ?? [];
  const businessGoals = m?.businessGoals ?? [];
  const learningGoals = m?.learningGoals ?? [];
  const milestones = m?.lifeMilestones ?? [];
  const openCommitments = (m?.commitments ?? []).filter(
    (c) => c.status === "open"
  );

  const hasAny = Boolean(
    northStar ||
      relationships ||
      learning ||
      health ||
      lifeVision ||
      personTheyWantToBecome ||
      careerGoals.length ||
      familyGoals.length ||
      healthGoals.length ||
      businessGoals.length ||
      learningGoals.length ||
      milestones.length ||
      openCommitments.length
  );

  return {
    northStar,
    relationships,
    learning,
    health,
    lifeVision,
    personTheyWantToBecome,
    careerGoals,
    familyGoals,
    healthGoals,
    businessGoals,
    learningGoals,
    milestones,
    openCommitments,
    hasAny,
  };
}

/** Parse Settings lines: "Label · YYYY-MM-DD · optional note" */
export function parseMilestonesText(
  value: string,
  existing: LifeMilestone[] = [],
  max = 8
): LifeMilestone[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((line) => {
      const parts = line.split(/\s*[·|]\s*/).map((p) => p.trim());
      const label = parts[0] || line;
      const maybeDate = parts[1] || "";
      const date = /^\d{4}-\d{2}-\d{2}$/.test(maybeDate) ? maybeDate : null;
      const note = date
        ? parts.slice(2).join(" · ")
        : parts.slice(1).join(" · ");
      const prior = existing.find(
        (m) => m.label.toLowerCase() === label.toLowerCase()
      );
      return {
        id: prior?.id ?? newId(),
        label,
        date,
        note,
      } satisfies LifeMilestone;
    });
}

export function formatMilestonesText(milestones: LifeMilestone[]): string {
  return milestones
    .map((m) => {
      if (m.date && m.note) return `${m.label} · ${m.date} · ${m.note}`;
      if (m.date) return `${m.label} · ${m.date}`;
      if (m.note) return `${m.label} · ${m.note}`;
      return m.label;
    })
    .join("\n");
}

/** Parse open commitments from Settings (one per line). */
export function parseCommitmentsText(
  value: string,
  existing: LifeCommitment[] = [],
  max = 8
): LifeCommitment[] {
  const keptClosed = existing.filter((c) => c.status !== "open");
  const openLines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);

  const now = new Date().toISOString();
  const open: LifeCommitment[] = openLines.map((text) => {
    const prior = existing.find(
      (c) => c.status === "open" && c.text.toLowerCase() === text.toLowerCase()
    );
    return (
      prior ?? {
        id: newId(),
        text,
        plannedFor: null,
        status: "open" as const,
        createdAt: now,
        followedUpAt: null,
        source: "user" as const,
      }
    );
  });

  return [...open, ...keptClosed].slice(0, 16);
}

export function formatOpenCommitmentsText(
  commitments: LifeCommitment[]
): string {
  return commitments
    .filter((c) => c.status === "open")
    .map((c) => c.text)
    .join("\n");
}

const COMMITMENT_RE =
  /\b(?:i(?:'m| am) going to|i(?:'ll| will)|i plan to|tomorrow i(?:'ll| will)?)\b([^.!?\n]{6,120})/i;

/** Pull a soft commitment from homework / transcript (never invent). */
export function extractCommitmentFromReport(
  report: SessionReport
): LifeCommitment | null {
  const candidates = [
    report.homework,
    ...report.transcript
      .filter((t) => t.role === "user")
      .map((t) => t.text)
      .slice(-6),
  ];

  for (const text of candidates) {
    const match = text.match(COMMITMENT_RE);
    if (!match) continue;
    const detail = (match[1] || "").trim().replace(/^[,:\s]+/, "");
    const full = `I'm going to${detail}`.replace(/\s+/g, " ").trim();
    if (full.length < 12) continue;
    return {
      id: newId(),
      text: full.slice(0, 180),
      plannedFor: /tomorrow/i.test(text) ? "tomorrow" : null,
      status: "open",
      createdAt: new Date().toISOString(),
      followedUpAt: null,
      source: "session",
    };
  }
  return null;
}

export function mergeCommitment(
  list: LifeCommitment[],
  next: LifeCommitment | null,
  max = 12
): LifeCommitment[] {
  if (!next) return list;
  if (
    list.some(
      (c) =>
        c.status === "open" &&
        c.text.toLowerCase() === next.text.toLowerCase()
    )
  ) {
    return list;
  }
  return [next, ...list].slice(0, max);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

const THEME_BUCKETS: Array<{ theme: string; keys: string[] }> = [
  {
    theme: "workplace conflict",
    keys: ["conflict", "manager", "boss", "workplace", "difficult", "argue"],
  },
  {
    theme: "interviews",
    keys: ["interview", "behavioral", "recruiter", "hiring"],
  },
  {
    theme: "presentations",
    keys: ["present", "presentation", "pitch", "audience"],
  },
  {
    theme: "negotiation",
    keys: ["negotiat", "salary", "offer", "deal"],
  },
  {
    theme: "family conversations",
    keys: ["family", "spouse", "partner", "parent", "daughter", "son", "kids"],
  },
];

function dominantTheme(reports: SessionReport[]): {
  theme: string;
  count: number;
} | null {
  const recent = reports.slice(0, 6);
  if (recent.length < 4) return null;
  const blob = recent
    .map(
      (r) =>
        `${r.scenarioTitle ?? ""} ${r.biggestWeakness} ${r.breakthrough} ${r.coachSummary}`
    )
    .join(" ")
    .toLowerCase();

  let best: { theme: string; count: number } | null = null;
  for (const bucket of THEME_BUCKETS) {
    const count = bucket.keys.reduce(
      (n, key) => n + (blob.includes(key) ? 1 : 0),
      0
    );
    if (count >= 3 && (!best || count > best.count)) {
      best = { theme: bucket.theme, count: recent.length };
    }
  }
  return best;
}

/**
 * Drift detection — ask, never judge.
 * Only fires when recent practice clusters away from the declared north star.
 */
export function detectDrift(
  memory: CoachMemory | null,
  reports: SessionReport[]
): DriftSignal | null {
  const northStar = memory?.northStar?.trim() || memory?.lifeVision?.trim() || "";
  if (!northStar) return null;

  const cluster = dominantTheme(reports);
  if (!cluster) return null;

  const starTokens = new Set(tokenize(northStar));
  const themeTokens = new Set(tokenize(cluster.theme));
  const overlap = [...themeTokens].some((t) => starTokens.has(t));
  // If north star already mentions this theme, it's not drift
  if (overlap) return null;
  // Also check if north star words appear heavily in recent practice
  const recentBlob = reports
    .slice(0, 6)
    .map((r) => `${r.scenarioTitle ?? ""} ${r.coachSummary}`)
    .join(" ")
    .toLowerCase();
  const starHits = [...starTokens].filter((t) => recentBlob.includes(t)).length;
  if (starHits >= 2) return null;

  return {
    theme: cluster.theme,
    sessionCount: cluster.count,
    northStar,
    askHint: `I also remember you said your biggest priority is ${northStar}. Do you think these conversations are helping you move toward that goal, or have they been pulling your attention away? Either answer is okay.`,
  };
}

export function findUpcomingMilestone(
  milestones: LifeMilestone[],
  withinDays = 14
): LifeMilestone | null {
  const now = Date.now();
  const horizon = withinDays * 24 * 60 * 60 * 1000;
  let best: { m: LifeMilestone; t: number } | null = null;
  for (const m of milestones) {
    if (!m.date) continue;
    const t = Date.parse(m.date);
    if (!Number.isFinite(t)) continue;
    const delta = t - now;
    if (delta < -2 * 24 * 60 * 60 * 1000) continue; // more than 2 days past
    if (delta > horizon) continue;
    if (!best || t < best.t) best = { m, t };
  }
  return best?.m ?? null;
}

export function findRecentPastMilestone(
  milestones: LifeMilestone[],
  withinDays = 10
): LifeMilestone | null {
  const now = Date.now();
  const window = withinDays * 24 * 60 * 60 * 1000;
  let best: { m: LifeMilestone; t: number } | null = null;
  for (const m of milestones) {
    if (!m.date) continue;
    const t = Date.parse(m.date);
    if (!Number.isFinite(t)) continue;
    const delta = now - t;
    if (delta < 0 || delta > window) continue;
    if (!best || t > best.t) best = { m, t };
  }
  return best?.m ?? null;
}

export function shouldAskVisionCheck(
  memory: CoachMemory | null,
  everyDays = 28
): boolean {
  if (!memory?.personTheyWantToBecome?.trim() && !memory?.lifeVision?.trim()) {
    return false;
  }
  if (!memory.lastVisionCheckAt) return memory.sessionsCompleted >= 4;
  const t = Date.parse(memory.lastVisionCheckAt);
  if (!Number.isFinite(t)) return true;
  const days = (Date.now() - t) / (24 * 60 * 60 * 1000);
  return days >= everyDays;
}

/**
 * Build purpose-aware coaching hints.
 * Priority: commitment → milestone → vision check → purpose opening → drift.
 * Never invent goals. Never decide what should matter.
 */
export function buildPurposePromptHints(
  memory: CoachMemory | null,
  reports: SessionReport[] = []
): PurposePromptHints {
  const compass = buildLifeCompass(memory);
  const name = memory?.preferredNickname?.trim() ||
    memory?.displayName?.trim().split(/\s+/)[0] ||
    "there";

  const open =
    compass.openCommitments.find((c) => !c.followedUpAt) ?? null;
  const commitmentFollowUp = open
    ? `Forge Law #014. Soft commitment follow-up for ${name}: Last time they planned — "${open.text}". Ask how it went. If they didn't do it: "That's okay. What got in the way?" Never say they failed.`
    : null;

  const upcoming = findUpcomingMilestone(compass.milestones);
  const recentPast = findRecentPastMilestone(compass.milestones);
  const milestone = upcoming || recentPast;
  const milestoneFollowUp = milestone
    ? upcoming
      ? `Life milestone (user-declared): "${milestone.label}"${milestone.date ? ` on ${milestone.date}` : ""}. Gently ask if they've thought about how they'd like to mark it — curiosity only.`
      : `Life milestone recently passed (user-declared): "${milestone.label}"${milestone.date ? ` (${milestone.date})` : ""}. Gently ask how it went.`
    : null;

  const vision = compass.personTheyWantToBecome || compass.lifeVision;
  const visionCheck =
    shouldAskVisionCheck(memory) && vision
      ? `Occasional vision check (permission-based): A while ago they said they wanted to become: "${vision}". Ask once, gently: do they still agree with that vision, or has something changed? Either answer is growth. Do not pressure.`
      : null;

  const purposeOpening =
    compass.northStar
      ? `Purpose alignment: They declared their north star as "${compass.northStar}". When inviting practice, connect today's work to that path — e.g. "You told me becoming a better communicator is part of ${compass.northStar}. Let's make today's practice count." Never invent a different goal.`
      : compass.lifeVision
        ? `Purpose alignment: Their declared life vision is "${compass.lifeVision}". Connect practice to that path when natural. Never invent goals.`
        : null;

  const drift = detectDrift(memory, reports);
  const driftAsk = drift
    ? `Drift detection (ask, never judge): Recent sessions cluster around ${drift.theme}. ${drift.askHint}`
    : null;

  return {
    purposeOpening,
    commitmentFollowUp,
    milestoneFollowUp,
    driftAsk,
    visionCheck,
  };
}

export function formatPurposeMemoryBlock(
  memory: CoachMemory | null,
  reports: SessionReport[] = []
): string {
  const compass = buildLifeCompass(memory);
  if (!compass.hasAny) {
    return `
Purpose / Life Compass:
- Not declared yet. Do NOT invent a north star or life goals.
- Forge Law #014: remember what matters; never decide what should matter.
`;
  }

  const hints = buildPurposePromptHints(memory, reports);

  return `
Purpose / Life Compass (USER-DECLARED ONLY — protect these; never rewrite them):
- North star: ${compass.northStar || "(not set)"}
- Life vision: ${compass.lifeVision || "(not set)"}
- Person they want to become: ${compass.personTheyWantToBecome || "(not set)"}
- Relationships: ${compass.relationships || "(not set)"}
- Learning: ${compass.learning || "(not set)"}
- Health: ${compass.health || "(not set)"}
- Career goals: ${compass.careerGoals.join("; ") || "(none)"}
- Family goals: ${compass.familyGoals.join("; ") || "(none)"}
- Business goals: ${compass.businessGoals.join("; ") || "(none)"}
- Health goals: ${compass.healthGoals.join("; ") || "(none)"}
- Learning goals (books/skills): ${compass.learningGoals.join("; ") || "(none)"}
- Milestones: ${
    compass.milestones
      .map((m) =>
        m.date ? `${m.label} (${m.date})` : m.label
      )
      .join("; ") || "(none)"
  }
- Open commitments: ${
    compass.openCommitments.map((c) => c.text).join("; ") || "(none)"
  }
- Purpose opening hint: ${hints.purposeOpening || "(none)"}
- Commitment follow-up: ${hints.commitmentFollowUp || "(none)"}
- Milestone follow-up: ${hints.milestoneFollowUp || "(none)"}
- Drift ask: ${hints.driftAsk || "(none)"}
- Vision check: ${hints.visionCheck || "(none)"}
- FORGE LAW #014: You may remember what matters to them. You must never decide what should matter to them. Ask; do not judge. Not a task manager.
`;
}
