/**
 * ACI-001 G1 — Executive Memory Keeper for Ask Atlas sitting close.
 * Classification precedes storage. Never Canonical. Never Living Profile.
 */

import type { MemoryClass } from "@/atlas/runtime/types/envelopes";
import type { AtlasThreadTurn } from "./thread";

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
      /\b(that'?s wrong|incorrect|correction:|not true|atlas was wrong|you.?re wrong|do not say)\b/i,
  },
  {
    kind: "decision",
    pattern: /\b(we decided|i decide|decision:|that'?s the decision|the decision is)\b/i,
  },
  {
    kind: "commitment",
    pattern: /\b(i commit|we commit|we will|we'?ll ship|commitment:)\b/i,
  },
  {
    kind: "risk",
    pattern: /\b(risk:|this risks|the risk is|could fail|danger)\b/i,
  },
  {
    kind: "mistake",
    pattern: /\b(mistake:|we got this wrong|we made a mistake|our mistake)\b/i,
  },
  {
    kind: "lesson",
    pattern: /\b(lesson:|we learned|the lesson is|next time we)\b/i,
  },
  {
    kind: "unresolved",
    pattern:
      /\b(unresolved|still open|not decided|parking this|open question)\b/i,
  },
];

const PROMOTE_PATTERN =
  /\b(promote|promotion candidate|admit this|canonical candidate)\b/i;

function excerptOf(text: string): string {
  return text.trim().slice(0, 400);
}

function detectKind(text: string): ExecutiveMemoryKind | null {
  for (const rule of KIND_PATTERNS) {
    if (rule.pattern.test(text)) return rule.kind;
  }
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
        `${index + 1}. [${record.class}/${record.kind}] ${record.summary} (not Canonical; sitting ${record.sitting_id})`
    )
    .join("\n");
}
