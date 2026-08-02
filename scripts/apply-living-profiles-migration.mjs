/**
 * Prints (and optionally reminds how to apply) the Living Profile migration.
 *
 * Usage:
 *   node scripts/apply-living-profiles-migration.mjs
 *
 * Apply in Supabase SQL editor, or via `supabase db push` / linked project.
 * This script does not invent a second profile store — it only surfaces the
 * canonical migration for living_profiles.
 */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260802_living_profiles.sql"
);

const sql = await readFile(migrationPath, "utf8");
console.log(sql);
console.log(
  "\n---\nApply this migration in the Supabase SQL editor (or supabase CLI) before relying on Living Profile persistence in production.\n"
);
