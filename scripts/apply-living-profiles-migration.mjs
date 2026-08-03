/** Retired one-off helper. Prints the authoritative migration paths only. */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(
  __dirname,
  "../supabase/migrations/manifest.json"
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

console.log(
  "This one-off Living Profile SQL helper is retired. Use the ordered deployment path in supabase/migrations/manifest.json."
);
for (const [name, files] of Object.entries(manifest.deploymentPaths)) {
  console.log(`\n${name}:`);
  files.forEach((file, index) => console.log(`${index + 1}. ${file}`));
}
