import type { ChromeTone } from "@/lib/light";
import { MOON_ARC_COLOR, type AltitudeSample } from "@/lib/solar";
import { cn } from "@/lib/utils";

/** Room under the horizon line so a deep night still reads as a curve. */
const ALTITUDE_PAD_RATIO = 0.1;
const MIN_ALTITUDE_SPAN = 8;

function altitudeDomain(samples: AltitudeSample[], showSun: boolean, showMoon: boolean) {
  let min = 0;
  let max = 0;
  for (const sample of samples) {
    if (showSun) {
      min = Math.min(min, sample.sunAltitude);
      max = Math.max(max, sample.sunAltitude);
    }
    if (showMoon) {
      min = Math.min(min, sample.moonAltitude);
      max = Math.max(max, sample.moonAltitude);
    }
  }
  const span = Math.max(max - min, MIN_ALTITUDE_SPAN);
  const pad = Math.max(3, span * ALTITUDE_PAD_RATIO);
  return { min: min - pad, max: max + pad };
}

export function AltitudeSparkline({
  samples,
  minutes,
  showSun,
  showMoon,
  tone = "night",
  rangeMinutes = 1440,
  nowOffset,
  className,
}: {
  samples: AltitudeSample[];
  minutes: number;
  showSun: boolean;
  showMoon: boolean;
  tone?: ChromeTone;
  rangeMinutes?: number;
  nowOffset?: number;
  className?: string;
}) {
  const parchment = tone === "parchment";
  if (samples.length < 2) return null;
  const width = 100;
  const height = 44;
  const domain = altitudeDomain(samples, showSun, showMoon);
  const x = (minute: number) => (minute / rangeMinutes) * width;
  const xLabel = (minute: number) =>
    x(Math.min(Math.max(minute, 0), rangeMinutes)).toFixed(2);
  const y = (altitude: number) =>
    height - ((altitude - domain.min) / (domain.max - domain.min)) * height;
  const line = (key: "sunAltitude" | "moonAltitude") =>
    samples
      .map((sample, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command}${x(sample.minute).toFixed(2)},${y(sample[key]).toFixed(2)}`;
      })
      .join(" ");
  const playhead = xLabel(minutes);
  const nowMarker = nowOffset === undefined ? null : xLabel(nowOffset);
  const horizonY = y(0).toFixed(2);
  const sunColor = parchment ? "#5c3b1e" : "#ffe38a";
  const moonColor = parchment ? "#8a6a45" : MOON_ARC_COLOR;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      overflow="visible"
      aria-hidden
      className={cn("block h-11 w-full overflow-visible", className)}
    >
      <defs>
        <filter id="sparkline-glow" x="-8%" y="-40%" width="116%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="0.35 1.15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {nowMarker !== null && (
        <line
          x1={nowMarker}
          x2={nowMarker}
          y1="0"
          y2={height}
          stroke={parchment ? "rgba(92,59,30,0.45)" : "rgba(240,180,41,0.55)"}
          strokeWidth="1"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <line
        x1="0"
        x2={String(width)}
        y1={horizonY}
        y2={horizonY}
        stroke={parchment ? "rgba(58,36,18,0.35)" : "rgba(255,255,255,0.28)"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {showMoon && (
        <path
          d={line("moonAltitude")}
          fill="none"
          stroke={moonColor}
          strokeWidth="1.55"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.72"
          filter="url(#sparkline-glow)"
        />
      )}
      {showSun && (
        <path
          d={line("sunAltitude")}
          fill="none"
          stroke={sunColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter="url(#sparkline-glow)"
        />
      )}
      <line
        x1={playhead}
        x2={playhead}
        y1="0"
        y2={height}
        stroke={parchment ? "#2b190d" : "#f7f3ea"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
