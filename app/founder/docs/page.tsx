import Link from "next/link";

const docs = [
  {
    href: "/founder/company",
    title: "Founder Brief & Company OS",
    blurb: "Strategic context and governing company documents.",
  },
  {
    href: "/founder/atlas",
    title: "Atlas Constitution & guidance",
    blurb: "Communicate with Atlas, review decisions, and operational counsel.",
  },
  {
    title: "Forge Laws",
    blurb: "Non-negotiable product and engineering constraints.",
    path: "atlas/forge-laws.md",
  },
  {
    title: "Architecture",
    blurb: "UNI-001 unified platform and AUTH-001 authentication foundation.",
    path: "atos/product/",
  },
  {
    title: "Operating Manuals",
    blurb: "ATOS manuals for Atlas and institutional operations.",
    path: "atos/manuals/",
  },
] as const;

export default function FounderDocsPage() {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/80">
        Documentation
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Institutional knowledge
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Founder Brief, Atlas Constitution, Forge Laws, architecture, and
        operating manuals — available only inside the Founder Portal.
      </p>
      <ul className="mt-10 space-y-6">
        {docs.map((doc) => (
          <li key={doc.title} className="border-b border-white/10 pb-5 last:border-0">
            <h2 className="text-base font-medium text-zinc-100">{doc.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{doc.blurb}</p>
            {"href" in doc && doc.href ? (
              <Link
                href={doc.href}
                className="mt-2 inline-block text-xs text-amber-200/90 hover:text-amber-100"
              >
                Open →
              </Link>
            ) : (
              <p className="mt-2 font-mono text-[11px] text-zinc-500">
                {"path" in doc ? doc.path : null}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
