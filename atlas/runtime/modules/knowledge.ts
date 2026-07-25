import { readFile } from "fs/promises";
import path from "path";
import type {
  AuthorityLabel,
  KnowledgeItem,
  KnowledgePlane,
  WorkflowState,
} from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * Catalog of legacy-atlas documents with explicit labels.
 * Parallel to atlas/engine/loader.ts — does NOT modify the loader.
 * Plane is always legacy-atlas until Founder-gated cutover.
 */
const LEGACY_CATALOG: Array<{
  source_id: string;
  filename: string;
  authority_label: AuthorityLabel;
  status: string;
  plane: KnowledgePlane;
}> = [
  {
    source_id: "legacy:constitution",
    filename: "constitution.md",
    authority_label: "legacy",
    status: "legacy-live",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:founder-brief",
    filename: "founder-brief.md",
    authority_label: "legacy",
    status: "legacy-live",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:forge-laws",
    filename: "forge-laws.md",
    authority_label: "legacy",
    status: "legacy-live",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:philosophy",
    filename: "philosophy.md",
    authority_label: "legacy",
    status: "legacy-live",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:projects",
    filename: "projects.md",
    authority_label: "operational",
    status: "ops",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:decisions",
    filename: "decisions.md",
    authority_label: "operational",
    status: "ops",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:roadmap",
    filename: "roadmap.md",
    authority_label: "operational",
    status: "ops",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:metrics",
    filename: "metrics.md",
    authority_label: "operational",
    status: "ops",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:engineering-protocol",
    filename: "engineering-protocol.md",
    authority_label: "legacy",
    status: "legacy-live",
    plane: "legacy-atlas",
  },
  {
    source_id: "legacy:bug-log",
    filename: "bug-log.md",
    authority_label: "operational",
    status: "ops",
    plane: "legacy-atlas",
  },
];

const ATLAS_DIR = path.join(process.cwd(), "atlas");

async function readExcerpt(filename: string, maxLen = 4000): Promise<string> {
  const contents = await readFile(path.join(ATLAS_DIR, filename), "utf8");
  const trimmed = contents.trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

function assertLabeled(item: KnowledgeItem): void {
  if (!item.authority_label) {
    throw new Error(`KnowledgeItem ${item.source_id} missing authority_label`);
  }
  if (!item.plane) {
    throw new Error(`KnowledgeItem ${item.source_id} missing plane`);
  }
  // Scaffold must never be treated as institutional/canonical
  if (item.status.toLowerCase() === "scaffold" && item.authority_label === "canonical") {
    throw new Error("Scaffold must not be labeled canonical");
  }
}

/**
 * rt.knowledge — retrieve governed knowledge with authority labels.
 * Requires AuthorityVerdict=pass. Parallel to Legacy loader; no loader mutation.
 */
export async function runKnowledge(state: WorkflowState): Promise<WorkflowState> {
  if (state.authority?.result !== "pass") {
    let next: WorkflowState = { ...state, stage: "knowledge" as const };
    next = traceStage(next, "knowledge", "Blocked: authority did not pass");
    return {
      ...next,
      error: "Knowledge requires AuthorityVerdict=pass",
    };
  }

  const items: KnowledgeItem[] = [];
  for (const entry of LEGACY_CATALOG) {
    const excerpt = await readExcerpt(entry.filename);
    const item: KnowledgeItem = {
      source_id: entry.source_id,
      authority_label: entry.authority_label,
      status: entry.status,
      excerpt_or_ref: excerpt,
      plane: entry.plane,
    };
    assertLabeled(item);
    items.push(item);
  }

  let next: WorkflowState = {
    ...state,
    knowledge: items,
    stage: "knowledge",
  };
  next = traceStage(
    next,
    "knowledge",
    `Loaded ${items.length} labeled KnowledgeItems (legacy-atlas plane)`,
    items.map((i) => i.source_id)
  );
  return next;
}

export function listKnowledgeCatalog(): typeof LEGACY_CATALOG {
  return LEGACY_CATALOG;
}
