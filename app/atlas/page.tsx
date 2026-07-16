import type { Metadata } from "next";
import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";
import FounderOS from "./FounderOS";

export const metadata: Metadata = {
  title: "Atlas | TalkForge Founder OS",
  description:
    "Atlas Founder Operating System — mission control, company health, founder metrics, notes, and daily brief.",
};

export const dynamic = "force-dynamic";

export default async function AtlasPage() {
  const snapshot = await loadFounderOpsSnapshot();

  return (
    <main className="min-h-screen bg-[#0b0c0f] font-[family-name:var(--font-geist-sans)] text-zinc-100">
      <FounderOS snapshot={snapshot} />
    </main>
  );
}
