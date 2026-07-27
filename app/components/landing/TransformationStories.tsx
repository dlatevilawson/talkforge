import Image from "next/image";
import Reveal from "@/app/components/landing/Reveal";

const stories = [
  {
    title: "A father rehearsing an apology",
    image: "/landing/chapter-humanity.jpg",
    position: "object-[50%_30%]",
  },
  {
    title: "A graduate practicing an interview",
    image: "/landing/chapter-problem.jpg",
    position: "object-center",
  },
  {
    title: "A manager preparing difficult feedback",
    image: "/landing/chapter-product.jpg",
    position: "object-[50%_40%]",
  },
  {
    title: "A teenager building confidence",
    image: "/landing/chapter-problem.jpg",
    position: "object-[60%_20%]",
  },
] as const;

/** Priority 3 — stories of transformation, not software screens. */
export default function TransformationStories() {
  return (
    <section id="stories" className="scroll-mt-0 bg-[var(--lp-bg)]">
      <div className="px-5 py-28 text-center sm:px-8 sm:py-36">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
            Recognition
          </p>
          <h2 className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Moments that matter deserve practice.
          </h2>
        </Reveal>
      </div>

      <div className="flex flex-col">
        {stories.map((story, index) => (
          <article
            key={story.title}
            className="relative min-h-[85vh] overflow-hidden"
          >
            <Image
              src={story.image}
              alt=""
              fill
              className={`object-cover ${story.position}`}
              sizes="100vw"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
            <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-end px-5 pb-20 text-center sm:pb-28">
              <Reveal>
                <h3 className="max-w-2xl font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                  {story.title}
                </h3>
                <p className="mt-8 text-sm font-medium uppercase tracking-[0.28em] text-white/70">
                  They practiced before it mattered.
                </p>
              </Reveal>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
