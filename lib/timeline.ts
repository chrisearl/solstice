import { timezoneAt } from "@/lib/civil-time";
import type { ChromeTone } from "@/lib/light";
import {
  buildSolarModel,
  dayIndexFromUtcDate,
  dateFromDayIndex,
  instantAtMinutes,
  resolveSunLightingPhase,
  type AltitudeSample,
  type SolarDayTimes,
} from "@/lib/solar";
import { getPosition, getMoonPosition } from "suncalc";

export const TIMELINE_DURATION_MINUTES = 48 * 60;

export const PLAYBACK_SPEEDS = [
  { label: "1×", minutesPerSecond: 1 },
  { label: "10×", minutesPerSecond: 10 },
  { label: "48×", minutesPerSecond: 48 },
  { label: "120×", minutesPerSecond: 120 },
  { label: "480×", minutesPerSecond: 480 },
] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface TimelineWindow {
  /** UTC instant of yesterday at 12:00 in the location timezone. */
  anchorMs: number;
  /** Minutes from anchor to the reference "now" when the window was built. */
  nowOffset: number;
  durationMinutes: number;
}

export interface SolarViewState {
  year: number;
  dayIndex: number;
  minutes: number;
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function localMinutesOfDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") * 60 + read("minute");
}

/** UTC instant for a civil clock time on a calendar day in `timeZone`. */
function zonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const target = hour * 60 + minute;
  let lo = Date.UTC(year, month - 1, day - 1, 12, 0);
  let hi = Date.UTC(year, month - 1, day + 1, 12, 0);
  while (hi - lo > 30_000) {
    const mid = Math.floor((lo + hi) / 2);
    const probe = new Date(mid);
    const probeDay = localDateParts(probe, timeZone);
    const sameDay =
      probeDay.year === year && probeDay.month === month && probeDay.day === day;
    const probeMinutes = localMinutesOfDay(probe, timeZone);
    if (!sameDay || probeMinutes < target) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export function resolveTimeZone(latitude: number, longitude: number): string {
  return timezoneAt(latitude, longitude) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Yesterday noon → tomorrow noon window anchored to `referenceNow`. */
export function buildTimelineWindow(
  referenceNow: Date,
  latitude: number,
  longitude: number,
): TimelineWindow {
  const timeZone = resolveTimeZone(latitude, longitude);
  const { year, month, day } = localDateParts(referenceNow, timeZone);
  const todayNoon = zonedDateTime(year, month, day, 12, 0, timeZone);
  const anchorMs = todayNoon.getTime() - 24 * 3_600_000;
  const nowOffset = (referenceNow.getTime() - anchorMs) / 60_000;
  return {
    anchorMs,
    nowOffset: Math.min(Math.max(nowOffset, 0), TIMELINE_DURATION_MINUTES),
    durationMinutes: TIMELINE_DURATION_MINUTES,
  };
}

export function instantFromOffset(anchorMs: number, offsetMinutes: number): Date {
  return new Date(anchorMs + offsetMinutes * 60_000);
}

export function offsetFromInstant(anchorMs: number, instant: Date): number {
  return (instant.getTime() - anchorMs) / 60_000;
}

export function offsetToSolarState(
  anchorMs: number,
  offsetMinutes: number,
  longitude: number,
): SolarViewState {
  const instant = instantFromOffset(anchorMs, offsetMinutes);
  for (const dayShift of [-1, 0, 1]) {
    const shifted = new Date(instant.getTime() + dayShift * 86_400_000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const day = shifted.getUTCDate();
    const midnight = instantAtMinutes(year, month, day, 0, longitude);
    const minutes = (instant.getTime() - midnight.getTime()) / 60_000;
    if (minutes >= 0 && minutes < 1440) {
      return { year, dayIndex: dayIndexFromUtcDate(shifted), minutes };
    }
  }
  const fallback = new Date(instant);
  const year = fallback.getUTCFullYear();
  const month = fallback.getUTCMonth();
  const day = fallback.getUTCDate();
  const midnight = instantAtMinutes(year, month, day, 0, longitude);
  const minutes = Math.min(1439, Math.max(0, (instant.getTime() - midnight.getTime()) / 60_000));
  return { year, dayIndex: dayIndexFromUtcDate(fallback), minutes };
}

export function solarStateToOffset(
  anchorMs: number,
  year: number,
  dayIndex: number,
  minutes: number,
  longitude: number,
): number {
  const date = dateFromDayIndex(year, dayIndex);
  const instant = instantAtMinutes(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    minutes,
    longitude,
  );
  return offsetFromInstant(anchorMs, instant);
}

export function timelineSamples(
  anchorMs: number,
  durationMinutes: number,
  latitude: number,
  longitude: number,
  stepMinutes = 12,
): AltitudeSample[] {
  const samples: AltitudeSample[] = [];
  for (let offset = 0; offset <= durationMinutes; offset += stepMinutes) {
    const { year, dayIndex, minutes } = offsetToSolarState(anchorMs, offset, longitude);
    const date = dateFromDayIndex(year, dayIndex);
    const instant = instantAtMinutes(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      minutes,
      longitude,
    );
    samples.push({
      minute: offset,
      dayMinute: minutes,
      year,
      dayIndex,
      sunAltitude: getPosition(instant, latitude, longitude).altitude,
      moonAltitude: getMoonPosition(instant, latitude, longitude).altitude,
    });
  }
  return samples;
}

export function timelinePhaseTrackStyle(
  samples: AltitudeSample[],
  latitude: number,
  longitude: number,
  tone: ChromeTone,
  durationMinutes: number,
) {
  const timesCache = new Map<string, SolarDayTimes>();
  const palette = tone === "parchment"
    ? {
        polar_night: "#2b190d",
        night: "#3a2412",
        astronomical_twilight: "#4e3420",
        nautical_twilight: "#654832",
        blue_hour: "#7d5c40",
        civil_twilight: "#a88862",
        golden_hour: "#c4a06a",
        daylight: "#e7d3ae",
        polar_day: "#efe2c8",
      }
    : {
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

  if (samples.length === 0) {
    return { backgroundColor: palette.night, backgroundImage: "none" };
  }

  const getTimes = (year: number, dayIndex: number) => {
    const key = `${year}-${dayIndex}`;
    if (!timesCache.has(key)) {
      timesCache.set(key, buildSolarModel({ year, dayIndex, latitude, longitude }).times);
    }
    return timesCache.get(key)!;
  };

  const stops = samples.map((sample) => {
    const dayMinute = sample.dayMinute ?? sample.minute;
    const times =
      sample.year !== undefined && sample.dayIndex !== undefined
        ? getTimes(sample.year, sample.dayIndex)
        : getTimes(new Date().getUTCFullYear(), 0);
    const phase = resolveSunLightingPhase(dayMinute, times, sample.sunAltitude, longitude);
    const pct = Math.min(100, Math.max(0, (sample.minute / durationMinutes) * 100));
    return `${palette[phase.id]} ${pct.toFixed(2)}%`;
  });

  return {
    backgroundColor: "transparent",
    backgroundImage: `linear-gradient(to right, ${stops.join(", ")})`,
  };
}

export function formatTimelineOffset(
  anchorMs: number,
  offsetMinutes: number,
  timeZone: string,
): string {
  const instant = instantFromOffset(anchorMs, offsetMinutes);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

export function nextPlaybackSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length];
}
