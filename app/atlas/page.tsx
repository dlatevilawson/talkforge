import type { Metadata } from "next";
import FounderConsole from "./FounderConsole";

export const metadata: Metadata = {
  title: "Atlas | TalkForge",
  description: "Founder dashboard for Atlas, Chief of Staff of TalkForge",
};

export default function AtlasPage() {
  return (
    <main className="min-h-screen bg-[#0b0c0f] font-[family-name:var(--font-geist-sans)] text-zinc-100">
      <FounderConsole />
    </main>
  );
}
