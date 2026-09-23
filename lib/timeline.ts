import {
  dateFromDayIndex,
  dayIndexFromUtcDate,
  daysInYear,
  instantAtMinutes,
} from "./solar.ts";

/** Mean-solar minutes in one calendar day. The strip is half-open: [0, 1440). */
export const DAY_MINUTES = 1440;

/** Date-input bounds. Playback pauses instead of leaving this range. */
export const SOLAR_YEAR_MIN = 1900;
export const SOLAR_YEAR_MAX = 2100;

export const PLAYBACK_SPEEDS = [
  { label: "1×", minutesPerSecond: 1 },
  { label: "10×", minutesPerSecond: 10 },
  { label: "48×", minutesPerSecond: 48 },
  { label: "120×", minutesPerSecond: 120 },
  { label: "480×", minutesPerSecond: 480 },
] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface SolarClock {
  year: number;
  dayIndex: number;
  /** Mean solar minutes since midnight. Half-open [0, 1440). */
  minutes: number;
}

export interface SolarClockSeed {
  year?: number;
  dayIndex?: number;
  minutes?: number;
}

export interface SolarClockStep {
  clock: SolarClock;
  blocked: boolean;
}

export interface AdvanceSolarClockOptions {
  /** When true, minutes wrap at midnight without advancing the calendar day. */
  loopDay?: boolean;
}

/**
 * Mean-solar calendar position of an instant at `longitude`.
 * SunCalc often returns the occurrence nearest UTC midnight, which can fall on
 * the previous UTC date for western longitudes. The search wraps that offset
 * onto the mean-solar day that actually contains the instant.
 */
export function clockFromInstant(instant: Date, longitude: number): SolarClock {
  for (const dayShift of [-1, 0, 1]) {
    const shifted = new Date(instant.getTime() + dayShift * 86_400_000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const day = shifted.getUTCDate();
    const midnight = instantAtMinutes(year, month, day, 0, longitude);
    const minutes = (instant.getTime() - midnight.getTime()) / 60_000;
    if (minutes >= 0 && minutes < DAY_MINUTES) {
      return { year, dayIndex: dayIndexFromUtcDate(shifted), minutes };
    }
  }
  const year = instant.getUTCFullYear();
  const month = instant.getUTCMonth();
  const day = instant.getUTCDate();
  const midnight = instantAtMinutes(year, month, day, 0, longitude);
  const minutes = Math.min(
    DAY_MINUTES - 0.001,
    Math.max(0, (instant.getTime() - midnight.getTime()) / 60_000),
  );
  return { year, dayIndex: dayIndexFromUtcDate(instant), minutes };
}

/** URL fields win. Missing year, day, or minutes come from `now` at `longitude`. */
export function initialClock(
  seed: SolarClockSeed | undefined,
  longitude: number,
  now: Date,
): SolarClock {
  const current = clockFromInstant(now, longitude);
  const year = seed?.year ?? current.year;
  const dayCount = daysInYear(year);
  const dayIndex = seed?.dayIndex ?? current.dayIndex;
  if (dayIndex < 0 || dayIndex >= dayCount) return current;
  const minutes =
    seed?.minutes === undefined
      ? current.minutes
      : ((seed.minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return { year, dayIndex, minutes };
}

export function isSameSolarDay(
  a: Pick<SolarClock, "year" | "dayIndex">,
  b: Pick<SolarClock, "year" | "dayIndex">,
): boolean {
  return a.year === b.year && a.dayIndex === b.dayIndex;
}

export function solarClockInstant(clock: SolarClock, longitude: number): Date {
  const date = dateFromDayIndex(clock.year, clock.dayIndex);
  return instantAtMinutes(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    clock.minutes,
    longitude,
  );
}

function shiftDays(clock: SolarClock, dayDelta: number): SolarClock | null {
  let year = clock.year;
  let dayIndex = clock.dayIndex + dayDelta;
  while (dayIndex >= daysInYear(year)) {
    dayIndex -= daysInYear(year);
    year += 1;
    if (year > SOLAR_YEAR_MAX) return null;
  }
  while (dayIndex < 0) {
    year -= 1;
    if (year < SOLAR_YEAR_MIN) return null;
    dayIndex += daysInYear(year);
  }
  if (year < SOLAR_YEAR_MIN || year > SOLAR_YEAR_MAX) return null;
  return { year, dayIndex, minutes: clock.minutes };
}

/**
 * Move a mean-solar clock by `deltaMinutes`, rolling the calendar date at midnight.
 * A step that would leave 1900-01-01 .. 2100-12-31 is refused: the clock stays put
 * and `blocked` is true so playback can pause.
 */
export function advanceSolarClock(
  clock: SolarClock,
  deltaMinutes: number,
  options?: AdvanceSolarClockOptions,
): SolarClockStep {
  if (deltaMinutes === 0) return { clock, blocked: false };
  if (options?.loopDay) {
    const minutes = ((clock.minutes + deltaMinutes) % DAY_MINUTES + DAY_MINUTES) % DAY_MINUTES;
    return { clock: { ...clock, minutes }, blocked: false };
  }
  let minutes = clock.minutes + deltaMinutes;
  let dayDelta = Math.floor(minutes / DAY_MINUTES);
  minutes -= dayDelta * DAY_MINUTES;
  if (minutes >= DAY_MINUTES) {
    minutes -= DAY_MINUTES;
    dayDelta += 1;
  }
  const shifted = shiftDays({ ...clock, minutes }, dayDelta);
  if (!shifted) return { clock, blocked: true };
  return { clock: shifted, blocked: false };
}

export function nextPlaybackSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length];
}
