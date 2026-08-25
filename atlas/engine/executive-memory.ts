/**
 * ACI-001 G1 — Executive Memory Keeper for Ask Atlas sitting close.
 * Classification precedes storage. Never Canonical. Never Living Profile.
 */

import type { MemoryClass } from "@/atlas/runtime/types/envelopes";
import type { AtlasThreadTurn } from "./thread.ts";

export const EXECUTIVE_MEMORY_KINDS = [
  "correction",
  "decision",
  "commitment",
  "risk",
  "mistake",
  "lesson",
  "unresolved",
] as const;

export type ExecutiveMemoryKind = (typeof EXECUTIVE_MEMORY_KINDS)[number];

export type ExecutiveMemoryProvenance = {
  sitting_id: string;
  source: "ask-atlas-sitting";
  turn_index: number;
  role: AtlasThreadTurn["role"];
  excerpt: string;
  extracted_at: string;
};

export type ExecutiveMemoryCandidate = {
  kind: ExecutiveMemoryKind;
  summary: string;
  provenance: ExecutiveMemoryProvenance;
};

export type ExecutiveMemoryRecord = {
  id: string;
  sitting_id: string;
  class: MemoryClass;
  kind: ExecutiveMemoryKind;
  summary: string;
  provenance: ExecutiveMemoryProvenance;
  canonical: false;
  stored_at: string;
};

const KIND_PATTERNS: Array<{ kind: ExecutiveMemoryKind; pattern: RegExp }> = [
  {
    kind: "correction",
    pattern:
      /\b(that'?s wrong|incorrect|not true|atlas was wrong|you.?re wrong|do not say)\b|correction:/i,
  },
  {
    kind: "decision",
    pattern:
      /\b(we decided|i decide|that'?s the decision|the decision is)\b|decision:/i,
  },
  {
    kind: "commitment",
    pattern: /\b(i commit|we commit|we'?ll ship)\b|we will |commitment:/i,
  },
  {
    kind: "risk",
    pattern: /\b(this risks|the risk is|could fail|danger)\b|risk:/i,
  },
  {
    kind: "mistake",
    pattern: /\b(we got this wrong|we made a mistake|our mistake)\b|mistake:/i,
  },
  {
    kind: "lesson",
    pattern: /\b(we learned|the lesson is|next time we)\b|lesson:/i,
  },
  {
    kind: "unresolved",
    pattern:
      /\b(unresolved|still open|not decided|parking this|open question)\b/i,
  },
];

const PROMOTE_PATTERN =
  /\b(promote|promotion candidate|admit this|canonical candidate)\b/i;

/**
 * Explicit Operational (not Canonical) durability the Founder states in
 * natural language — not a Decision: label, and not admission.
 */
const OPERATIONAL_CONTEXT_PATTERN =
  /\boperational context\b|\bthis is operational\b|\bnot company policy\b/i;

const CODENAME_PATTERN = /\bcodename\b/i;

const IMPERATIVE_USE_FOR_PATTERN =
  /^(?:please\s+)?use\b[\s\S]{1,160}\bfor\b/i;

function excerptOf(text: string): string {
  return text.trim().slice(0, 400);
}

function isInterrogativeOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.endsWith("?")) return false;
  return !/[.!]/u.test(trimmed.slice(0, -1));
}

function isOperatingDecision(text: string): boolean {
  if (isInterrogativeOnly(text)) return false;
  if (OPERATIONAL_CONTEXT_PATTERN.test(text)) return true;
  if (CODENAME_PATTERN.test(text)) return true;
  return IMPERATIVE_USE_FOR_PATTERN.test(text.trim());
}

function detectKind(text: string): ExecutiveMemoryKind | null {
  for (const rule of KIND_PATTERNS) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  // Operating choice / named operational context. Class stays Operational;
  // this does not admit Canonical knowledge.
  if (isOperatingDecision(text)) return "decision";
  return null;
}

function wantsPromotion(text: string): boolean {
  return PROMOTE_PATTERN.test(text);
}

/**
 * Extract durable *candidates* from a sitting. Raw turns are not Canonical.
 * When nothing matches, nothing is extracted (Temporary sitting ends).
 */
export function extractExecutiveMemoryCandidates(
  thread: AtlasThreadTurn[],
  sittingId: string,
  now = new Date().toISOString()
): ExecutiveMemoryCandidate[] {
  const candidates: ExecutiveMemoryCandidate[] = [];

  thread.forEach((turn, index) => {
    if (turn.role !== "user") return;
    const kind = detectKind(turn.content);
    if (!kind) return;

    candidates.push({
      kind,
      summary: excerptOf(turn.content),
      provenance: {
        sitting_id: sittingId,
        source: "ask-atlas-sitting",
        turn_index: index,
        role: turn.role,
        excerpt: excerptOf(turn.content),
        extracted_at: now,
      },
    });
  });

  return candidates;
}

/**
 * Classify a candidate. Eligible kinds may be Operational or Promotion Candidate.
 * Unsure paths stay Temporary. Canonical is always false.
 */
export function classifyExecutiveMemoryCandidate(
  candidate: ExecutiveMemoryCandidate,
  founderText: string
): MemoryClass {
  if (wantsPromotion(founderText)) return "promotion_candidate";
  return "operational";
}

export function classifySittingClose(
  thread: AtlasThreadTurn[],
  sittingId: string,
  now = new Date().toISOString()
): ExecutiveMemoryRecord[] {
  const candidates = extractExecutiveMemoryCandidates(thread, sittingId, now);
  return candidates.map((candidate, i) => {
    const classValue = classifyExecutiveMemoryCandidate(
      candidate,
      candidate.provenance.excerpt
    );
    return {
      id: `${sittingId}_${i}`,
      sitting_id: sittingId,
      class: classValue,
      kind: candidate.kind,
      summary: candidate.summary,
      provenance: candidate.provenance,
      canonical: false,
      stored_at: now,
    };
  });
}

export function assertNeverCanonical(
  records: ReadonlyArray<{ canonical: boolean }>
): void {
  for (const record of records) {
    if (record.canonical !== false) {
      throw new Error("Executive Memory refused: canonical must be false");
    }
  }
}

export function newSittingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sit_${crypto.randomUUID()}`;
  }
  return `sit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Format classified records for counsel. Never labeled Canonical.
 */
export function formatOperationalMemoryForCounsel(
  records: ExecutiveMemoryRecord[],
  limit = 12
): string {
  const usable = records
    .filter(
      (record) =>
        record.canonical === false &&
        (record.class === "operational" ||
          record.class === "promotion_candidate")
    )
    .slice(0, limit);

  if (usable.length === 0) return "";

  return usable
    .map(
      (record, index) =>
        `${index + 1}. [${record.class}/${record.kind}] ${record.summary} (not Canonical; sitting ${record.sitting_id}; source ${record.provenance.source})`
    )
    .join("\n");
}

const MEMORY_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "what",
  "did",
  "about",
  "have",
  "has",
  "was",
  "were",
  "are",
  "not",
  "our",
  "you",
  "your",
]);

function tokensOf(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
    (token) => !MEMORY_STOPWORDS.has(token)
  );
}

function tokensRelated(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) {
    const stem = a.slice(0, 5);
    return a.startsWith(stem) && b.startsWith(stem);
  }
  return false;
}

function kindHintFromQuery(query: string): ExecutiveMemoryKind | null {
  if (
    /\bdecid|\bdecision\b|\bcodename\b|\boperational context\b/i.test(query)
  ) {
    return "decision";
  }
  if (/\bcorrect|\bwrong\b|\bincorrect\b/i.test(query)) return "correction";
  if (/\bcommit/i.test(query)) return "commitment";
  if (/\brisk|\bcould fail\b/i.test(query)) return "risk";
  if (/\bmistake\b/i.test(query)) return "mistake";
  if (/\blesson|\blearned\b/i.test(query)) return "lesson";
  if (/\bunresolved|\bstill open\b|\bopen question\b/i.test(query)) {
    return "unresolved";
  }
  return null;
}

/**
 * Retrieve relevant classified records for a *later* sitting.
 * Irrelevant memories stay out. Retrieved records remain not Canonical.
 */
export function retrieveRelevantExecutiveMemory(
  query: string,
  records: ExecutiveMemoryRecord[],
  options?: { limit?: number; minScore?: number }
): ExecutiveMemoryRecord[] {
  const limit = options?.limit ?? 3;
  const minScore = options?.minScore ?? 2;
  const queryTokens = tokensOf(query);
  const hintedKind = kindHintFromQuery(query);

  const scored = records
    .filter(
      (record) =>
        record.canonical === false &&
        (record.class === "operational" ||
          record.class === "promotion_candidate")
    )
    .map((record) => {
      const summaryTokens = tokensOf(`${record.summary} ${record.kind}`);
      const overlap = queryTokens.filter((token) =>
        summaryTokens.some((other) => tokensRelated(token, other))
      ).length;
      const kindBonus = hintedKind && hintedKind === record.kind ? 1 : 0;
      return { record, score: overlap + kindBonus, overlap };
    })
    .filter((row) => row.overlap >= 1 && row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.record);

  return scored;
}
