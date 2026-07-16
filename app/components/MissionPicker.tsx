import Link from "next/link";

const missions = [
  {
    href: "/small-talk",
    title: "Small Talk",
    description: "Start easy conversations with warmth and curiosity.",
  },
  {
    href: "/interview",
    title: "Interview",
    description: "Practice clear, confident answers under pressure.",
  },
  {
    href: "/leadership",
    title: "Leadership",
    description: "Guide people with clarity, empathy, and direction.",
  },
  {
    href: "/negotiation",
    title: "Negotiation",
    description: "Ask for what you need without losing the relationship.",
  },
  {
    href: "/storytelling",
    title: "Storytelling",
    description: "Make ideas memorable with structure and presence.",
  },
  {
    href: "/difficult-conversations",
    title: "Difficult Conversations",
    description: "Stay calm, honest, and constructive when stakes are high.",
  },
];

export default function MissionPicker({
  title = "What would you like to forge today?",
  subtitle = "Every conversation is another opportunity to become more confident, more thoughtful, and more capable.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
        Practice
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        {subtitle}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {missions.map((mission) => (
          <Link
            key={mission.href}
            href={mission.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <h2 className="text-lg font-medium text-white">{mission.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {mission.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
