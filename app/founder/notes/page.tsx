import FounderNotesPanel from "@/app/atlas/components/FounderNotesPanel";
import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";

export const dynamic = "force-dynamic";

export default async function FounderNotesPage() {
  const snapshot = await loadFounderOpsSnapshot();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
          Founder Notes
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Private workspace</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Ideas, strategy, and notes — never visible to regular members.
        </p>
      </div>
      <FounderNotesPanel initialNotes={snapshot.notes} />
    </div>
  );
}
