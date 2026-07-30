import { readdir, readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const DOCS: { file: string; title: string }[] = [
  { file: "founder-brief.md", title: "Founder Brief" },
  { file: "forge-laws.md", title: "Forge Laws" },
  { file: "constitution.md", title: "Atlas Constitution" },
  { file: "philosophy.md", title: "Philosophy" },
  { file: "mission.md", title: "Mission" },
  { file: "decisions.md", title: "Decisions" },
];

export default async function CompanyOsPage() {
  const atlasDir = path.join(process.cwd(), "atlas");
  const available = new Set(await readdir(atlasDir).catch(() => [] as string[]));

  const sections = await Promise.all(
    DOCS.filter((d) => available.has(d.file)).map(async (d) => {
      const raw = await readFile(path.join(atlasDir, d.file), "utf8");
      return { ...d, excerpt: raw.slice(0, 900) };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
          Company Operating System
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Governing documents</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Atlas references these whenever offering strategic counsel. Full ATOS
          lives under <code className="text-zinc-300">atos/</code>.
        </p>
      </div>
      <div className="space-y-6">
        {sections.map((s) => (
          <article
            key={s.file}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="text-lg font-medium">{s.title}</h2>
            <p className="mt-1 text-xs text-zinc-500">atlas/{s.file}</p>
            <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-zinc-400">
              {s.excerpt}
              {s.excerpt.length >= 900 ? "…" : ""}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
