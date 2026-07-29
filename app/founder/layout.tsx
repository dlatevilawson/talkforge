import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";

const nav = [
  { href: "/founder", label: "Dashboard" },
  { href: "/founder/atlas", label: "Atlas" },
  { href: "/founder/company", label: "Company OS" },
  { href: "/founder/projects", label: "Projects" },
  { href: "/founder/agents", label: "Agents" },
  { href: "/founder/analytics", label: "Analytics" },
  { href: "/founder/notes", label: "Notes" },
] as const;

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session.authenticated || session.role !== "founder") {
    redirect("/login?founder=1&next=/founder");
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b0c0f] text-zinc-100">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/80">
              Founder Portal
            </p>
            <Link href="/founder" className="text-lg font-semibold tracking-wide">
              Headquarters
            </Link>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Founder">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/app/dashboard"
            className="text-xs text-zinc-400 hover:text-white"
          >
            ← Gym
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
