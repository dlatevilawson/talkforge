import Link from "next/link";
import CommunityForge from "@/app/components/landing/CommunityForge";
import FinaleIdentity from "@/app/components/landing/FinaleIdentity";
import ForgeMonoliths from "@/app/components/landing/ForgeMonoliths";
import HeroCinematic from "@/app/components/landing/HeroCinematic";
import LandingNav from "@/app/components/landing/LandingNav";
import ProductReveal from "@/app/components/landing/ProductReveal";
import Reveal from "@/app/components/landing/Reveal";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import TransformationStories from "@/app/components/landing/TransformationStories";

/**
 * Creative Direction V3 — From Communication to Life.
 * Design memories. Sell moments. Light motif: spark → flame → illumination.
 */
export default function LandingPage() {
  return (
    <div className="lp-root min-h-[100dvh] bg-black text-[var(--lp-ink)]">
      <LandingNav />

      <main>
        {/* Curiosity — spark */}
        <HeroCinematic />

        {/* Recognition — life moments (never say “communication”) */}
        <TransformationStories />

        {/* Hope — The Forge museum */}
        <ForgeMonoliths />

        {/* Quiet bridge */}
        <section className="bg-[var(--lp-bg)] px-5 py-32 text-center sm:px-8 sm:py-40">
          <Reveal>
            <p className="mx-auto max-w-2xl font-[family-name:var(--font-lp-display)] text-3xl font-medium leading-snug tracking-[-0.03em] sm:text-4xl">
              Advice is common.
              <br />
              Practice is rare.
            </p>
          </Reveal>
        </section>

        {/* Confidence — conversation first; device last */}
        <ProductReveal />

        {/* Belonging — living constellation */}
        <CommunityForge />

        {/* Reverence — mission as monument */}
        <section
          id="mission"
          className="lp-mission-monument scroll-mt-0 bg-[var(--lp-bg)] px-5 py-48 sm:px-10 sm:py-64"
        >
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <blockquote className="font-[family-name:var(--font-lp-display)] text-[2.1rem] font-medium leading-[1.2] tracking-[-0.04em] text-[var(--lp-ink)] sm:text-5xl md:text-6xl md:leading-[1.12] lg:text-7xl">
                Nobody should ever feel voiceless because they don&apos;t know
                how to express themselves.
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* Identity → Action */}
        <FinaleIdentity />
      </main>

      <footer className="border-t border-white/10 bg-black px-5 py-12 text-white/40 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <TalkForgeLogo variant="mark" className="text-white" />
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white/75">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/75">
              Terms
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/25">
          © {new Date().getFullYear()} TalkForge.
        </p>
      </footer>
    </div>
  );
}
