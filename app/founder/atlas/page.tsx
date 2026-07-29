import FounderOS from "@/app/atlas/FounderOS";
import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";

export const dynamic = "force-dynamic";

export default async function FounderAtlasPage() {
  const snapshot = await loadFounderOpsSnapshot();
  return (
    <div>
      <p className="mb-6 text-xs uppercase tracking-[0.28em] text-zinc-500">
        Atlas Command Center · Chief of Staff
      </p>
      <FounderOS snapshot={snapshot} />
    </div>
  );
}
