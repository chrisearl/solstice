import type { ChromeTone } from "@/lib/light";
import { cn } from "@/lib/utils";

export function OrbitalSparkline({
  samples,
  dayIndex,
  dayCount,
  tone = "night",
  className,
}: {
  samples: number[];
  dayIndex: number;
  dayCount: number;
  tone?: ChromeTone;
  className?: string;
}) {
  const parchment = tone === "parchment";
  if (samples.length < 2) return null;

  const width = 100;
  const height = 44;
  const x = (index: number) => (index / (samples.length - 1)) * width;
  const y = (phase: number) => height - phase * height;
  const path = samples
    .map((phase, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${x(index).toFixed(2)},${y(phase).toFixed(2)}`;
    })
    .join(" ");
  const playhead = x((dayIndex / Math.max(1, dayCount - 1)) * (samples.length - 1)).toFixed(2);
  const stroke = parchment ? "#5c3b1e" : "#7eb8ff";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      overflow="visible"
      aria-hidden
      className={cn("block h-11 w-full overflow-visible", className)}
    >
      <line
        x1="0"
        y1={height * 0.5}
        x2={width}
        y2={height * 0.5}
        stroke={parchment ? "#9b764b44" : "#ffffff18"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
      <line
        x1={playhead}
        y1="0"
        x2={playhead}
        y2={height}
        stroke={parchment ? "#3a2310" : "#f0b429"}
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
    </svg>
  );
}
