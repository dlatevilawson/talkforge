"use client";

import type { ExecutiveMemoryRecord } from "@/atlas/engine/executive-memory";
import { formatWhen } from "./tone";

function classLabel(record: ExecutiveMemoryRecord): string {
  if (record.class === "promotion_candidate") return "Promotion Candidate";
  if (record.class === "operational") return "Operational Memory";
  return record.class;
}

type ExecutiveMemoryPanelProps = {
  records: ExecutiveMemoryRecord[];
};

export default function ExecutiveMemoryPanel({
  records,
}: ExecutiveMemoryPanelProps) {
  return (
    <section id="executive-memory" className="scroll-mt-8">
      <div className="flex items-end justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          Executive Memory
        </h2>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
          Classified · not Canonical
        </p>
      </div>

      <div className="px-4 py-4">
        <p className="text-sm leading-6 text-zinc-500">
          Memory Keeper output from closed Ask Atlas sittings. Operational or
          Promotion Candidate only. Canonical admission remains STD-002.
        </p>

        {records.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            No classified Executive Memory yet. Close an Ask Atlas sitting to
            extract durable candidates.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {records.map((record) => (
              <li key={record.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {classLabel(record)}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                    {record.kind}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-700">
                    not Canonical
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-100">{record.summary}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {formatWhen(record.stored_at)} · sitting{" "}
                  {record.sitting_id.slice(0, 14)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
