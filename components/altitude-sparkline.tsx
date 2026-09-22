import type { ChromeTone } from "@/lib/light";
import { MOON_ARC_COLOR, type AltitudeSample } from "@/lib/solar";

const MIN_ALT = -30;
const MAX_ALT = 90;

export function AltitudeSparkline({
  samples,
  minutes,
  showSun,
  showMoon,
  tone = "night",
  rangeMinutes = 1440,
  nowOffset,
}: {
  samples: AltitudeSample[];
  minutes: number;
  showSun: boolean;
  showMoon: boolean;
  tone?: ChromeTone;
  rangeMinutes?: number;
  nowOffset?: number;
}) {
  const parchment = tone === "parchment";
  if (samples.length < 2) return null;
  const width = 100;
  const height = 44;
  const x = (minute: number) => (minute / rangeMinutes) * width;
  const xLabel = (minute: number) =>
    x(Math.min(Math.max(minute, 0), rangeMinutes)).toFixed(2);
  const y = (altitude: number) => {
    const clamped = Math.min(MAX_ALT, Math.max(MIN_ALT, altitude));
    return height - ((clamped - MIN_ALT) / (MAX_ALT - MIN_ALT)) * height;
  };
  const line = (key: "sunAltitude" | "moonAltitude") =>
    samples
      .map((sample, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command}${x(sample.minute).toFixed(2)},${y(sample[key]).toFixed(2)}`;
      })
      .join(" ");
  const playhead = xLabel(minutes);
  const nowMarker = nowOffset === undefined ? null : xLabel(nowOffset);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-11 w-full"
    >
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
        y1={y(0).toFixed(2)}
        y2={y(0).toFixed(2)}
        stroke={parchment ? "rgba(58,36,18,0.35)" : "rgba(255,255,255,0.28)"}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {showMoon && (
        <path
          d={line("moonAltitude")}
          fill="none"
          stroke={parchment ? "#8a6a45" : MOON_ARC_COLOR}
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          opacity="0.75"
        />
      )}
      {showSun && (
        <path
          d={line("sunAltitude")}
          fill="none"
          stroke={parchment ? "#5c3b1e" : "#ffe38a"}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
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
