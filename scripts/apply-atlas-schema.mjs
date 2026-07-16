/**
 * Prints the Atlas Phase 3 SQL and optionally applies it when
 * SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_DB_URL) is available.
 *
 * Usage:
 *   node scripts/apply-atlas-schema.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-atlas-schema.mjs --apply
 */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
const sql = await readFile(schemaPath, "utf8");

const atlasOnly = sql.slice(sql.indexOf("-- Atlas Founder OS"));
console.log("Atlas Phase 3 SQL:\n");
console.log(atlasOnly.trim());
console.log(
  "\nApply this in the Supabase SQL editor if founder_notes / founder_briefs are missing."
);

if (process.argv.includes("--apply")) {
  console.error(
    "\n--apply requires a privileged DB connection. Use the Supabase SQL editor with the printed SQL."
  );
  process.exit(1);
}
