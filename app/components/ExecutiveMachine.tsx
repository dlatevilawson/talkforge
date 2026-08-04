"use client";

import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

type ExecutiveMachineProps = {
  ready: boolean;
  intensity: string;
};

/**
 * The Executive Machine is a product-state object, not decorative artwork.
 * Its light and status language communicate whether today's training is ready.
 */
export default function ExecutiveMachine({
  ready,
  intensity,
}: ExecutiveMachineProps) {
  return (
    <figure
      className="relative mx-auto aspect-[4/5] w-full max-w-[25rem]"
      aria-labelledby="executive-machine-title"
    >
      <div
        className={`tf-machine absolute inset-[7%_8%_10%] overflow-hidden rounded-[42%_42%_34%_34%/30%_30%_24%_24%] border ${
          ready ? "tf-machine-ready" : ""
        }`}
      >
        <div className="absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(145deg,rgba(255,255,255,.1),transparent_32%,rgba(0,0,0,.55)_70%),radial-gradient(circle_at_50%_14%,rgba(224,195,131,.13),transparent_34%),#101113]" />
        <div className="absolute inset-x-[14%] top-[8%] h-[18%] rounded-[50%] border border-white/[0.08] bg-[radial-gradient(ellipse_at_center,rgba(226,194,123,.13),rgba(0,0,0,.55)_68%)] shadow-[inset_0_1px_1px_rgba(255,255,255,.1)]" />

        <div className="absolute left-1/2 top-[44%] h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d7b56a]/20 bg-[radial-gradient(circle,rgba(230,198,128,.12)_0%,rgba(15,16,18,.95)_57%,#050607_70%)] shadow-[0_0_80px_rgba(198,151,67,.08),inset_0_0_36px_rgba(0,0,0,.9)]">
          <div className="tf-machine-orbit absolute inset-[9%] rounded-full border border-dashed border-[#d8b871]/20" />
          <div className="absolute inset-[23%] grid place-items-center rounded-full border border-white/[0.08] bg-[radial-gradient(circle_at_42%_34%,#2c2d30,#090a0b_65%)] shadow-[0_16px_45px_rgba(0,0,0,.65),inset_0_1px_2px_rgba(255,255,255,.12)]">
            <span className={ready ? "tf-machine-core" : ""}>
              <TalkForgeLogo variant="mark" className="scale-75 opacity-90" />
            </span>
          </div>
        </div>

        <div className="absolute inset-x-[12%] bottom-[11%] flex items-center justify-between rounded-full border border-white/[0.07] bg-black/35 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-sm">
          <span className="flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-zinc-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ready
                  ? "bg-[#e5c37b] shadow-[0_0_12px_rgba(229,195,123,.8)]"
                  : "bg-zinc-600"
              }`}
            />
            {ready ? "Ready" : "Calibrating"}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-zinc-600">
            {intensity}
          </span>
        </div>

        <div className="absolute bottom-[3.5%] left-1/2 h-px w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="absolute inset-x-[19%] bottom-[4%] h-[7%] rounded-[50%] bg-black/70 blur-xl" />
      <figcaption className="sr-only">
        <span id="executive-machine-title">Executive Machine</span>
        {ready
          ? " — calibrated and ready for today’s training."
          : " — calibrating your training from your Living Profile."}
      </figcaption>
    </figure>
  );
}
