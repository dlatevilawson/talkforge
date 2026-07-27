"use client";

import Image from "next/image";

/** Product as proof of philosophy — appears only after emotion/belief/identity. */
export default function ProductReveal() {
  return (
    <div className="lp-product-reveal relative mx-auto mt-16 flex max-w-5xl flex-col items-center gap-12 lg:mt-20 lg:flex-row lg:items-center lg:justify-center lg:gap-20">
      <div className="lp-phone relative w-[220px] shrink-0 sm:w-[260px]">
        <div className="lp-phone-frame overflow-hidden rounded-[2rem] border border-[var(--lp-line)] bg-[var(--lp-ink)] shadow-[0_40px_80px_-40px_rgba(18,20,23,0.45)]">
          <div className="relative aspect-[9/19] w-full">
            <Image
              src="/landing/chapter-product.jpg"
              alt="Practicing a conversation on TalkForge"
              fill
              className="object-cover opacity-90"
              sizes="260px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-8 pt-20">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                Forge
              </p>
              <div className="lp-waveform mt-4 flex h-10 items-end gap-1" aria-hidden>
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="lp-waveform-bar w-1 rounded-full bg-white/80"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/90">
                Conversation becomes confidence.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ol className="max-w-md space-y-8 text-left">
        {[
          {
            title: "Conversation",
            body: "Practice the words before the moment arrives.",
          },
          {
            title: "Confidence",
            body: "Capability grows through repetition — not pep talks.",
          },
          {
            title: "Opportunity",
            body: "Show up ready when the conversation counts.",
          },
          {
            title: "A better life",
            body: "Clearer words. Stronger trust. More open futures.",
          },
        ].map((item, index) => (
          <li key={item.title} className="lp-transform-step">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--lp-muted)]">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-lp-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--lp-ink)]">
              {item.title}
            </h3>
            <p className="mt-2 text-base leading-7 text-[var(--lp-muted)]">
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
