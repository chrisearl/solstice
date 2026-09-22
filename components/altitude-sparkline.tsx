import { MOON_ARC_COLOR, type AltitudeSample } from "@/lib/solar";

const MIN_ALT = -30;
const MAX_ALT = 90;

export function AltitudeSparkline({
  samples,
  minutes,
  showSun,
  showMoon,
}: {
  samples: AltitudeSample[];
  minutes: number;
  showSun: boolean;
  showMoon: boolean;
}) {
  if (samples.length < 2) return null;
  const width = 100;
  const height = 44;
  const x = (minute: number) => (minute / 1440) * width;
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
  const playhead = x(Math.min(Math.max(minutes, 0), 1440));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-11 w-full"
    >
      <line
        x1="0"
        x2={width}
        y1={y(0)}
        y2={y(0)}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {showMoon && (
        <path
          d={line("moonAltitude")}
          fill="none"
          stroke={MOON_ARC_COLOR}
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          opacity="0.75"
        />
      )}
      {showSun && (
        <path
          d={line("sunAltitude")}
          fill="none"
          stroke="#ffe38a"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <line
        x1={playhead}
        x2={playhead}
        y1="0"
        y2={height}
        stroke="#f7f3ea"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
