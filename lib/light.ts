import {
  resolveSunLightingPhase,
  type AltitudeSample,
  type SolarDayTimes,
  type SunLightingPhase,
} from "./solar.ts";

/** Band colors for the clock. Dark phases stay readable as chip fills with light ink. */
export const PHASE_COLORS: Record<SunLightingPhase, string> = {
  polar_night: "#161a28",
  night: "#161a28",
  astronomical_twilight: "#243056",
  nautical_twilight: "#2f4d78",
  blue_hour: "#4d6e9a",
  civil_twilight: "#8aa4b8",
  golden_hour: "#e0a04a",
  daylight: "#f0d78a",
  polar_day: "#f0d78a",
};

export const PHASE_TEXT: Record<SunLightingPhase, string> = {
  polar_night: "#c5cbe0",
  night: "#c5cbe0",
  astronomical_twilight: "#c5d0ea",
  nautical_twilight: "#d5e2f5",
  blue_hour: "#d6e4f5",
  civil_twilight: "#d5e4ee",
  golden_hour: "#e0a04a",
  daylight: "#f0d78a",
  polar_day: "#f0d78a",
};

export function phaseInk(id: SunLightingPhase): string {
  switch (id) {
    case "daylight":
    case "golden_hour":
    case "polar_day":
    case "civil_twilight":
      return "#1b1406";
    default:
      return "#f7f3ea";
  }
}

export function phaseTrackStyle(
  samples: AltitudeSample[],
  times: SolarDayTimes,
  longitude: number,
): { backgroundColor: string; backgroundImage: string } {
  if (times.alwaysDown) {
    return { backgroundColor: PHASE_COLORS.polar_night, backgroundImage: "none" };
  }
  if (times.alwaysUp) {
    return { backgroundColor: PHASE_COLORS.polar_day, backgroundImage: "none" };
  }
  if (samples.length === 0) {
    return { backgroundColor: PHASE_COLORS.night, backgroundImage: "none" };
  }
  const stops = samples.map((sample) => {
    const phase = resolveSunLightingPhase(sample.minute, times, sample.sunAltitude, longitude);
    const pct = Math.min(100, Math.max(0, (sample.minute / 1440) * 100));
    return `${PHASE_COLORS[phase.id]} ${pct.toFixed(2)}%`;
  });
  return {
    backgroundColor: "transparent",
    backgroundImage: `linear-gradient(to right, ${stops.join(", ")})`,
  };
}
