import type { SkillKey } from "@/lib/types";

const SKILL_LABELS: Record<SkillKey, string> = {
  confidence: "Confidence",
  empathy: "Empathy",
  listening: "Listening",
  clarity: "Clarity",
  storytelling: "Storytelling",
  negotiation: "Negotiation",
  leadership: "Leadership",
};

type Props = {
  skills: Partial<Record<SkillKey, number>> | undefined;
  /** Hide the per-skill chip row when vectors are shown elsewhere. */
  showLegend?: boolean;
};

/** Professional skill waveform — Voice of Your Growth. */
export default function SkillsWaveform({
  skills,
  showLegend = false,
}: Props) {
  const keys = Object.keys(SKILL_LABELS) as SkillKey[];
  const values = keys.map((key) =>
    Math.max(0, Math.min(100, Number(skills?.[key] ?? 0)))
  );

  const width = 640;
  const height = 160;
  const mid = height / 2;
  const step = width / (values.length * 4);
  const points: string[] = [];
  for (let i = 0; i <= values.length * 4; i += 1) {
    const skillIndex = Math.min(values.length - 1, Math.floor(i / 4));
    const nextIndex = Math.min(values.length - 1, skillIndex + 1);
    const t = (i % 4) / 4;
    const amplitude =
      (values[skillIndex] * (1 - t) + values[nextIndex] * t) / 100;
    const envelope = 0.35 + 0.65 * Math.sin((i / (values.length * 4)) * Math.PI);
    const y = mid - amplitude * envelope * (mid - 18);
    const x = i * step;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  for (let i = values.length * 4; i >= 0; i -= 1) {
    const skillIndex = Math.min(values.length - 1, Math.floor(i / 4));
    const nextIndex = Math.min(values.length - 1, skillIndex + 1);
    const t = (i % 4) / 4;
    const amplitude =
      (values[skillIndex] * (1 - t) + values[nextIndex] * t) / 100;
    const envelope = 0.35 + 0.65 * Math.sin((i / (values.length * 4)) * Math.PI);
    const y = mid + amplitude * envelope * (mid - 18);
    const x = i * step;
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  points.push("Z");
  const path = points.join(" ");
  const strokePoints = keys
    .map((_, index) => {
      const x = ((index + 0.5) / keys.length) * width;
      const amplitude = values[index] / 100;
      const y = mid - amplitude * 0.85 * (mid - 18);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full sm:h-40"
          role="img"
          aria-label="Presence trajectory waveform"
        >
          <defs>
            <linearGradient id="tf-wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0c07a" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#c9a95f" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#c9a95f" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="tf-wave-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b9098" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#e0c07a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#8b9098" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={mid}
            x2={width}
            y2={mid}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          <path d={path} fill="url(#tf-wave-fill)" />
          <path
            d={strokePoints}
            fill="none"
            stroke="url(#tf-wave-stroke)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {keys.map((key, index) => {
            const x = ((index + 0.5) / keys.length) * width;
            const amplitude = values[index] / 100;
            const y = mid - amplitude * 0.85 * (mid - 18);
            return (
              <circle
                key={key}
                cx={x}
                cy={y}
                r={values[index] > 0 ? 3.2 : 2}
                fill={values[index] > 0 ? "#f0c97d" : "rgba(255,255,255,0.2)"}
              />
            );
          })}
        </svg>
      </div>

      {showLegend ? (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {keys.map((key, index) => (
            <li
              key={key}
              className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5"
            >
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-zinc-500">
                {SKILL_LABELS[key]}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-200">
                {values[index] || "—"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function compositeSignalScore(
  skills: Partial<Record<SkillKey, number>> | undefined
): number | null {
  if (!skills) return null;
  const values = (Object.keys(SKILL_LABELS) as SkillKey[])
    .map((key) => Number(skills[key] ?? 0))
    .filter((n) => n > 0);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
