import Link from "next/link";
import {
  formatDuration,
  formatSessionWhen,
  poiseLabel,
  sessionDisplayTitle,
} from "@/lib/system2/practice-history-display";
import type { PracticeSession } from "@/lib/types";

type Props = {
  sessions: PracticeSession[];
  emptyMessage?: string;
};

/**
 * Training History session cards — owned by /app/history (not Living Profile).
 */
export default function PracticeHistoryGrid({
  sessions,
  emptyMessage = "No completed sessions yet.",
}: Props) {
  if (sessions.length === 0) {
    return <p className="mt-4 text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sessions.map((session) => {
        const title = sessionDisplayTitle(session);
        const duration = formatDuration(session.durationSeconds);
        const poise = poiseLabel(session.averageScore);
        return (
          <li key={session.id}>
            <Link
              href={`/app/reflect/${session.id}`}
              className="group relative flex aspect-square flex-col justify-between rounded-[1.35rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a95f]"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  {session.modality === "voice" ? "Voice" : "Text"}
                </span>
                <span
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-black transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                >
                  <svg viewBox="0 0 20 20" className="h-3 w-3">
                    <path
                      d="M5 15 15 5M8 5h7v7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <span>
                <span className="line-clamp-3 text-[0.92rem] font-semibold leading-snug tracking-tight text-white">
                  {title}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  {duration ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#e0c07a]">
                      {duration}
                    </span>
                  ) : null}
                  {poise ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-300">
                      {poise}
                    </span>
                  ) : null}
                  <span className="text-xs text-zinc-500">
                    {formatSessionWhen(session.completedAt ?? session.startedAt)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
