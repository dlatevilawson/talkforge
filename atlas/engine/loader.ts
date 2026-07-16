import { readFile } from "fs/promises";
import path from "path";
import type { AtlasContext } from "./context";

const ATLAS_DIR = path.join(process.cwd(), "atlas");

async function readTextDocument(filename: string): Promise<string> {
  const filePath = path.join(ATLAS_DIR, filename);
  const contents = await readFile(filePath, "utf8");
  return contents.trim();
}

/**
 * Load every Atlas institutional document into memory and return one AtlasContext.
 */
export async function loadAtlasContext(): Promise<AtlasContext> {
  const [
    constitution,
    founderBrief,
    forgeLaws,
    philosophy,
    projects,
    decisions,
    roadmap,
    metrics,
  ] = await Promise.all([
    readTextDocument("constitution.md"),
    readTextDocument("founder-brief.md"),
    readTextDocument("forge-laws.md"),
    readTextDocument("philosophy.md"),
    readTextDocument("projects.md"),
    readTextDocument("decisions.md"),
    readTextDocument("roadmap.md"),
    readTextDocument("metrics.md"),
  ]);

  return {
    constitution,
    founderBrief,
    forgeLaws,
    philosophy,
    projects,
    decisions,
    roadmap,
    metrics,
  };
}
