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

console.log("This one-off Atlas SQL helper is retired.");
console.log(
  "Use the ordered deployment path in supabase/migrations/manifest.json."
);
for (const [name, files] of Object.entries(manifest.deploymentPaths)) {
  console.log(`\n${name}:`);
  files.forEach((file, index) => console.log(`${index + 1}. ${file}`));
}

if (process.argv.includes("--apply")) {
  console.error(
    "\nRefusing --apply: one-off or partial schema deployment is not supported."
  );
  process.exit(1);
}
