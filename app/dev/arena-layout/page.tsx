"use client";

import { useState } from "react";
import Link from "next/link";
import ArenaConversation from "@/app/components/arena/ArenaConversation";
import type { TranscriptTurn } from "@/lib/ce/transcript";

/**
 * Dev-only layout preview for Arena conversation + speak dock.
 * Not linked from product navigation.
 */
export default function ArenaLayoutPreviewPage() {
  const [turns, setTurns] = useState<TranscriptTurn[]>([
    {
      turnIndex: 0,
      role: "forge",
      text: "When you're trying to explain something out loud, what usually happens?",
      finalizedAt: "2026-08-15T00:00:01.000Z",
      sourceEvent: "preview",
    },
    {
      turnIndex: 1,
      role: "founder",
      text: "I know what I want to say, but the words don't come quickly when I feel watched.",
      finalizedAt: "2026-08-15T00:00:02.000Z",
      sourceEvent: "preview",
    },
    {
      turnIndex: 2,
      role: "forge",
      text: "Is it more that you know the point but can't find the wording, or that the thought itself hasn't formed yet?",
      finalizedAt: "2026-08-15T00:00:03.000Z",
      sourceEvent: "preview",
    },
  ]);

  function addMessage() {
    setTurns((prev) => {
      const n = prev.length;
      const role = n % 2 === 0 ? ("founder" as const) : ("forge" as const);
      return [
        ...prev,
        {
          turnIndex: n,
          role,
          text:
            role === "founder"
              ? `User reply ${n + 1}: another concrete detail about speaking under pressure in meetings.`
              : `Forge follow-up ${n + 1}: one discriminating question about what happens in that exact moment.`,
          finalizedAt: new Date().toISOString(),
          sourceEvent: "preview",
        },
      ];
    });
  }

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#000000] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(212,175,55,0.12),transparent_52%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link
            href="/app"
            className="justify-self-start text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]/70"
          >
            TalkForge Arena
          </Link>
          <span className="justify-self-center rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/08 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
            Layout Preview
          </span>
          <button
            type="button"
            onClick={addMessage}
            className="justify-self-end text-sm text-white/50 transition hover:text-white/80"
          >
            Add message
          </button>
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center pt-4 text-center">
          <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col text-left">
            <ArenaConversation turns={turns} />
            <div className="shrink-0 border-t border-[#D4AF37]/10 bg-gradient-to-t from-black via-black/95 to-transparent pt-3 text-center">
              <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]/80">
                Your turn
              </p>
              <div className="mt-4 w-full pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))]">
                <div className="rounded-[1.35rem] border border-[#D4AF37]/18 bg-[#0c0c0d]/92 px-3.5 py-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-4">
                  <div className="flex w-full items-center gap-2.5">
                    <button
                      type="button"
                      className="relative flex min-h-[3.25rem] flex-1 items-center justify-center gap-2.5 rounded-full border border-[#D4AF37]/32 bg-[linear-gradient(180deg,rgba(212,175,55,0.1),rgba(12,12,13,0.92))] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8d5a3]"
                    >
                      <span
                        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]/75 shadow-[0_0_10px_rgba(212,175,55,0.55)]"
                        aria-hidden
                      />
                      Hold to speak
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-full border border-white/12 px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50"
                    >
                      Stop
                    </button>
                  </div>
                  <p className="mt-2.5 text-[10px] uppercase tracking-[0.14em] text-white/28">
                    Press and hold · release to send
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
