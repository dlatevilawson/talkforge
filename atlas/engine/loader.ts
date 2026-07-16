import { readFile } from "fs/promises";
import path from "path";
import type { AtlasContext } from "./context";

const ATLAS_DIR = path.join(process.cwd(), "atlas");

async function readTextDocument(filename: string): Promise<string> {
  const filePath = path.join(ATLAS_DIR, filename);
  const contents = await readFile(filePath, "utf8");
  return contents.trim();
}

async function readJsonDocument(filename: string): Promise<unknown> {
  const filePath = path.join(ATLAS_DIR, filename);
  const contents = await readFile(filePath, "utf8");
  const trimmed = contents.trim();

  if (!trimmed) {
    return [];
  }

  return JSON.parse(trimmed) as unknown;
}

/**
 * Load Atlas institutional documents into memory and return one AtlasContext.
 */
export async function loadAtlasContext(): Promise<AtlasContext> {
  const [
    founderBrief,
    constitution,
    forgeLaws,
    philosophy,
    projects,
    decisions,
  ] = await Promise.all([
    readTextDocument("founder-brief.md"),
    readTextDocument("constitution.md"),
    readTextDocument("forge-laws.md"),
    readTextDocument("philosophy.md"),
    readJsonDocument("projects.json"),
    readJsonDocument("decisions.json"),
  ]);

  return {
    founderBrief,
    constitution,
    forgeLaws,
    philosophy,
    projects,
    decisions,
  };
}
