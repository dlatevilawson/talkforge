import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import MissionPicker from "@/app/components/MissionPicker";

export default function TrainingPage() {
  return (
    <AppShell>
      <section className="mb-10 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-200/80">
          PPS-001 wedge
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Preparing for a technical interview?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80 sm:text-base">
          Start with the event — not a generic mission. Name the interview, then
          practice with evidence-based coaching. Reality capture closes the loop.
        </p>
        <Link
          href="/prepare"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Prepare for an interview
        </Link>
      </section>

      <MissionPicker
        title="Other practice paths"
        subtitle="Secondary for now. V1 capacity focuses on technical interview transfer proof."
      />
    </AppShell>
  );
}
