"use client";

import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "@/lib/ce/transcript";

type Props = {
  turns: TranscriptTurn[];
  /** In-progress Forge speech (italic, no bubble). */
  liveForgeText?: string | null;
  /** In-progress user speech (italic, no bubble). */
  liveUserText?: string | null;
  className?: string;
};

/**
 * Live conversation surface — Grok-like clarity:
 * Forge text open on the left; finalized user turns in dark bubbles on the right;
 * live partials in muted italics.
 *
 * Scrolls inside its own pane so the Hold-to-speak dock stays pinned below.
 */
export default function ArenaConversation({
  turns,
  liveForgeText,
  liveUserText,
  className = "",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const forgeLive = liveForgeText?.trim() ?? "";
  const userLive = liveUserText?.trim() ?? "";

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [turns.length, forgeLive, userLive]);

  const empty = turns.length === 0 && !forgeLive && !userLive;

  return (
    <div
      ref={scrollerRef}
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2 ${className}`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {empty ? (
        <p className="px-2 py-8 text-center text-sm text-white/35">
          Conversation appears here as you and Forge speak.
        </p>
      ) : (
        <ul className="flex w-full flex-col gap-4 pb-6 text-left">
          {turns.map((turn) =>
            turn.role === "forge" ? (
              <li
                key={`${turn.turnIndex}-${turn.finalizedAt}`}
                className="max-w-[92%] self-start text-left text-[15px] leading-6 text-white/90 sm:text-base sm:leading-7"
              >
                {turn.text}
              </li>
            ) : (
              <li
                key={`${turn.turnIndex}-${turn.finalizedAt}`}
                className="max-w-[85%] self-end"
              >
                <div className="rounded-2xl rounded-br-md bg-[#2a2a2e] px-3.5 py-2.5 text-left text-[15px] leading-6 text-white sm:text-base sm:leading-7">
                  {turn.text}
                </div>
              </li>
            )
          )}
          {forgeLive ? (
            <li className="max-w-[92%] self-start text-left text-[15px] italic leading-6 text-white/45 sm:text-base sm:leading-7">
              {forgeLive}
            </li>
          ) : null}
          {userLive ? (
            <li className="max-w-[85%] self-end text-right text-[15px] italic leading-6 text-white/40 sm:text-base sm:leading-7">
              {userLive}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
