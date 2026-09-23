import {
  addTime,
  getMoonIllumination,
  getMoonPosition,
  getMoonTimes,
  getPosition,
  getTimes,
  times as sunTimeConfig,
} from "suncalc";
import { seasonInstants } from "./seasons.ts";

/** Blue hour boundaries at −4° below the horizon (not included in stock SunCalc). */
if (!sunTimeConfig.some((row) => row[1] === "blueHourEnd")) {
  addTime(-4, "blueHourEnd", "blueHour");
}

/** Ground disc radius in scene units. */
export const DISC_RADIUS = 5.2;
/** Sky dome used for the sun and its arcs. Horizon contacts sit on this radius. */
export const SKY_RADIUS = 4.65;
/** Height of the gnomon at the center of the disc. */
export const GNOMON_HEIGHT = 0.62;

export const HORIZON_RATIO = SKY_RADIUS / DISC_RADIUS;

const DEG = Math.PI / 180;
const SAMPLE_MINUTES = 8;
/** Noon positions closer than this share one tube so the arcs don't flicker. */
const MERGE_DISTANCE = 0.14;

export const ARC_COLORS = {
  summer: "#ff8c32",
  winter: "#79c7ff",
  equinox: "#f3ecdf",
  selected: "#ffe38a",
} as const;

export const MOON_ARC_COLOR = "#b8c9de";

export const ORLANDO = { name: "Orlando, FL", lat: 28.5383, lng: -81.3792 };

export const PRESETS = [
  ORLANDO,
  { name: "Reykjavík", lat: 64.1466, lng: -21.9426 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
] as const;

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SolarArc {
  id: "summer" | "winter" | "equinox" | "selected";
  label: string;
  detail: string;
  color: string;
  points: Vec3[];
  closed: boolean;
  /** Fainter continuation below the horizon, under the disc. */
  underPoints: Vec3[];
  underClosed: boolean;
  emphasized: boolean;
  apex: Vec3 | null;
}

export type SunLightingPhase =
  | "polar_night"
  | "polar_day"
  | "night"
  | "astronomical_twilight"
  | "nautical_twilight"
  | "blue_hour"
  | "civil_twilight"
  | "golden_hour"
  | "daylight";

export interface SunLightingPhaseInfo {
  id: SunLightingPhase;
  label: string;
  hint: string;
}

export interface SolarDayTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  alwaysUp: boolean;
  alwaysDown: boolean;
  dayLengthMs: number | null;
  dawn: Date | null;
  dusk: Date | null;
  nauticalDawn: Date | null;
  nauticalDusk: Date | null;
  nightEnd: Date | null;
  night: Date | null;
  goldenHourEnd: Date | null;
  goldenHour: Date | null;
  blueHourEnd: Date | null;
  blueHour: Date | null;
}

export interface AzimuthFan {
  start: number;
  sweep: number;
}

export interface HorizonMarks {
  sunriseAzimuth: number | null;
  sunsetAzimuth: number | null;
  riseFan: AzimuthFan | null;
  setFan: AzimuthFan | null;
}

export interface AltitudeSample {
  minute: number;
  /** Mean-solar minute within the day when the sample spans multiple days. */
  dayMinute?: number;
  year?: number;
  dayIndex?: number;
  sunAltitude: number;
  moonAltitude: number;
}

export type SeasonJump = "summer" | "march" | "september" | "winter";

export interface SolarModel {
  date: Date;
  arcs: SolarArc[];
  note: string | null;
  times: SolarDayTimes;
  horizon: HorizonMarks;
}

export interface SunPlacement {
  azimuth: number;
  altitude: number;
  position: Vec3;
  bearing: Vec3;
  aboveHorizon: boolean;
  shadow: Vec3 | null;
  lightingPhase: SunLightingPhaseInfo;
}

/** Shared arc geometry for sun seasonal paths and the moon path. */
export interface SkyPath {
  label: string;
  detail: string;
  color: string;
  points: Vec3[];
  closed: boolean;
  underPoints: Vec3[];
  underClosed: boolean;
  emphasized: boolean;
  apex: Vec3 | null;
}

export interface MoonModel {
  arc: SkyPath;
  times: {
    rise: Date | null;
    set: Date | null;
    alwaysUp: boolean;
    alwaysDown: boolean;
  };
}

export interface MoonPlacement {
  azimuth: number;
  altitude: number;
  position: Vec3;
  bearing: Vec3;
  aboveHorizon: boolean;
  fraction: number;
  phase: number;
  waxing: boolean;
  phaseLabel: string;
}

export type CoordinateStatus = "valid" | "draft" | "invalid";

/**
 * Map a horizontal sun position into the scene.
 * +Y is up, +X is east, +Z is north.
 * Azimuth is degrees clockwise from north, matching SunCalc 2.
 */
export function project(
  azimuthDeg: number,
  altitudeDeg: number,
  radius: number,
): Vec3 {
  const az = azimuthDeg * DEG;
  const alt = altitudeDeg * DEG;
  const horizontal = Math.cos(alt) * radius;
  return {
    x: Math.sin(az) * horizontal,
    y: Math.sin(alt) * radius,
    z: Math.cos(az) * horizontal,
  };
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

export function dayIndexFromUtcDate(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.round((current - start) / 86_400_000);
}

export function dateFromDayIndex(year: number, dayIndex: number): Date {
  return new Date(Date.UTC(year, 0, 1 + dayIndex));
}

export function dayIndexFromLocalDate(date: Date): {
  year: number;
  dayIndex: number;
} {
  const year = date.getFullYear();
  const utc = new Date(Date.UTC(year, date.getMonth(), date.getDate()));
  return { year, dayIndex: dayIndexFromUtcDate(utc) };
}

/** Instant for a clock time in mean solar time at `longitude`. */
export function instantAtMinutes(
  year: number,
  month: number,
  day: number,
  minutes: number,
  longitude: number,
): Date {
  const offsetMs = (longitude / 15) * 3_600_000;
  return new Date(Date.UTC(year, month, day, 0, 0, 0) + minutes * 60_000 - offsetMs);
}

export function formatMeanTime(date: Date | null, longitude: number): string {
  if (!date || Number.isNaN(date.getTime())) return "—";
  const offsetMs = (longitude / 15) * 3_600_000;
  const local = new Date(date.getTime() + offsetMs);
  let hours = local.getUTCHours();
  const minutes = local.getUTCMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatMinutes(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const mins = Math.floor(wrapped % 60);
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function minutesToTimeValue(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const mins = Math.floor(wrapped % 60);
  return `${String(hours24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isoFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(
  iso: string,
): { year: number; dayIndex: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, dayIndex: dayIndexFromUtcDate(date) };
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return "—";
  const total = Math.round(ms / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDegrees(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}°`;
}

export function compassLabel(azimuth: number): string {
  const wrapped = ((azimuth % 360) + 360) % 360;
  return CARDINALS[Math.round(wrapped / 22.5) % 16];
}

export function formatAzimuth(azimuth: number): string {
  return `${formatDegrees(azimuth)} ${compassLabel(azimuth)}`;
}

export function coordinateStatus(
  value: string,
  min: number,
  max: number,
): CoordinateStatus {
  const text = value.trim();
  if (
    text === "" ||
    text === "-" ||
    text === "." ||
    text === "-." ||
    /^-?\d+\.$/.test(text)
  ) {
    return "draft";
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "invalid";
  const n = Number(text);
  if (n < min || n > max) return "invalid";
  return "valid";
}

export function parseCoordinate(
  value: string,
  min: number,
  max: number,
): number | null {
  return coordinateStatus(value, min, max) === "valid" ? Number(value.trim()) : null;
}

export function locationLabel(lat: number, lng: number): string {
  const preset = PRESETS.find(
    (item) => Math.abs(item.lat - lat) < 1e-4 && Math.abs(item.lng - lng) < 1e-4,
  );
  if (preset) return preset.name;
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

function calendarDateAtLongitude(instant: Date, longitude: number): Date {
  const offsetMs = (longitude / 15) * 3_600_000;
  const local = new Date(instant.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function seasonalDates(year: number, latitude: number, longitude: number) {
  const instants = seasonInstants(year);
  const june = calendarDateAtLongitude(instants.june, longitude);
  const december = calendarDateAtLongitude(instants.december, longitude);
  const march = calendarDateAtLongitude(instants.march, longitude);
  const september = calendarDateAtLongitude(instants.september, longitude);
  const northern = latitude >= 0;
  return {
    summer: northern ? june : december,
    winter: northern ? december : june,
    march,
    september,
  };
}

function dedupe(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (
      prev &&
      Math.hypot(prev.x - point.x, prev.y - point.y, prev.z - point.z) < 1e-3
    ) {
      continue;
    }
    out.push(point);
  }
  return out;
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta * t + 360) % 360;
}

interface Sample extends Vec3 {
  altitude: number;
  azimuth: number;
}

function horizonPoint(a: Sample, b: Sample): Vec3 {
  const t = a.altitude / (a.altitude - b.altitude);
  return project(lerpAngle(a.azimuth, b.azimuth, t), 0, SKY_RADIUS);
}

function meanSolarDayWindow(
  year: number,
  month: number,
  day: number,
  longitude: number,
): { start: number; end: number } {
  const start = instantAtMinutes(year, month, day, 0, longitude).getTime();
  const end = instantAtMinutes(year, month, day, 1440, longitude).getTime();
  return { start, end };
}

/** Drop long chords that stitch disconnected horizon endpoints across the disc. */
export function splitPathRuns(points: Vec3[], maxGap = 1.25): Vec3[][] {
  if (points.length < 2) return [];
  const runs: Vec3[][] = [[points[0]]];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const next = points[index];
    const gap = Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z);
    if (gap > maxGap) runs.push([next]);
    else runs[runs.length - 1].push(next);
  }
  return runs.filter((run) => run.length > 1);
}

function sampleBodyPath(
  date: Date,
  latitude: number,
  longitude: number,
  positionAt: (instant: Date) => { azimuth: number; altitude: number },
  extraStamps: number[] = [],
): { points: Vec3[]; closed: boolean; underPoints: Vec3[]; underClosed: boolean } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const { start: windowStart, end: windowEnd } = meanSolarDayWindow(
    year,
    month,
    day,
    longitude,
  );
  const stamps: number[] = [];

  for (let minutes = 0; minutes <= 1440; minutes += SAMPLE_MINUTES) {
    stamps.push(instantAtMinutes(year, month, day, minutes, longitude).getTime());
  }
  for (const stamp of extraStamps) {
    if (stamp >= windowStart && stamp <= windowEnd) stamps.push(stamp);
  }
  stamps.sort((a, b) => a - b);

  const samples: Sample[] = stamps.map((ms) => {
    const position = positionAt(new Date(ms));
    return {
      ...project(position.azimuth, position.altitude, SKY_RADIUS),
      altitude: position.altitude,
      azimuth: position.azimuth,
    };
  });

  const above: Vec3[] = [];
  const belowRuns: Vec3[][] = [];
  let below: Vec3[] | null = null;
  const pushBelow = (point: Vec3) => {
    if (!below) below = [];
    below.push(point);
  };
  const finishBelow = () => {
    if (below && below.length > 0) belowRuns.push(below);
    below = null;
  };

  for (let i = 0; i < samples.length; i++) {
    const current = samples[i];
    const previous = samples[i - 1];
    const rising = Boolean(previous && previous.altitude < 0 && current.altitude >= 0);
    const setting = Boolean(previous && previous.altitude >= 0 && current.altitude < 0);
    const horizon = previous && (rising || setting) ? horizonPoint(previous, current) : null;
    const point = { x: current.x, y: current.y, z: current.z };

    if (rising && horizon) {
      pushBelow(horizon);
      finishBelow();
      above.push(horizon);
    }
    if (current.altitude >= 0) {
      above.push(point);
    } else {
      if (setting && horizon) {
        above.push(horizon);
        pushBelow(horizon);
      }
      pushBelow(point);
    }
  }
  finishBelow();

  const alwaysUp = samples.length > 2 && samples.every((sample) => sample.altitude > 0.4);
  const alwaysDown = samples.length > 2 && samples.every((sample) => sample.altitude < -0.4);
  const cleaned = dedupe(above);
  const points = alwaysUp && cleaned.length > 3 ? cleaned.slice(0, -1) : cleaned;

  let underPoints: Vec3[] = [];
  let underClosed = false;
  if (alwaysDown && belowRuns.length > 0) {
    const loop = dedupe(belowRuns[0]);
    underPoints = loop.length > 3 ? loop.slice(0, -1) : loop;
    underClosed = underPoints.length > 3;
  } else if (
    belowRuns.length >= 2 &&
    samples[0].altitude < 0 &&
    samples[samples.length - 1].altitude < 0
  ) {
    const head = belowRuns[0];
    const tail = belowRuns[belowRuns.length - 1];
    underPoints = dedupe([...tail, ...head]);
  } else if (belowRuns[0]) {
    underPoints = dedupe(belowRuns[0]);
  }

  return { points, closed: alwaysUp, underPoints, underClosed };
}

function samplePath(
  date: Date,
  latitude: number,
  longitude: number,
): { points: Vec3[]; closed: boolean; underPoints: Vec3[]; underClosed: boolean } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const noonInstant = instantAtMinutes(year, month, day, 720, longitude);
  const times = getTimes(noonInstant, latitude, longitude);
  const extras = [times.sunrise, times.sunset]
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());
  return sampleBodyPath(
    date,
    latitude,
    longitude,
    (instant) => getPosition(instant, latitude, longitude),
    extras,
  );
}

function sampleMoonPath(
  date: Date,
  latitude: number,
  longitude: number,
): { points: Vec3[]; closed: boolean; underPoints: Vec3[]; underClosed: boolean } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const noonInstant = instantAtMinutes(year, month, day, 720, longitude);
  const times = getMoonTimes(noonInstant, latitude, longitude);
  const extras = [times.rise, times.set]
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());
  return sampleBodyPath(
    date,
    latitude,
    longitude,
    (instant) => getMoonPosition(instant, latitude, longitude),
    extras,
  );
}

function apexOf(points: Vec3[]): Vec3 | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => (point.y > best.y ? point : best));
}

function noonPosition(date: Date, latitude: number, longitude: number): Vec3 {
  const times = getTimes(date, latitude, longitude);
  const position = getPosition(times.solarNoon, latitude, longitude);
  return project(position.azimuth, position.altitude, SKY_RADIUS);
}

function samePath(a: Vec3, b: Vec3): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < MERGE_DISTANCE;
}

function makeArc(
  id: SolarArc["id"],
  label: string,
  detail: string,
  color: string,
  date: Date,
  latitude: number,
  longitude: number,
  emphasized: boolean,
): SolarArc {
  const path = samplePath(date, latitude, longitude);
  return {
    id,
    label,
    detail,
    color,
    points: path.points,
    closed: path.closed,
    underPoints: path.underPoints,
    underClosed: path.underClosed,
    emphasized,
    apex: apexOf(path.points),
  };
}

function separation(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function eventAzimuth(
  instant: Date | null,
  latitude: number,
  longitude: number,
): number | null {
  if (!instant) return null;
  return getPosition(instant, latitude, longitude).azimuth;
}

function riseSetAzimuths(date: Date, latitude: number, longitude: number) {
  const times = getTimes(date, latitude, longitude);
  return {
    rise: eventAzimuth(validDate(times.sunrise), latitude, longitude),
    set: eventAzimuth(validDate(times.sunset), latitude, longitude),
  };
}

export function azimuthFan(
  edgeA: number | null,
  edgeB: number | null,
  contains: number | null,
): AzimuthFan | null {
  if (edgeA == null || edgeB == null || contains == null) return null;
  const clockwise = (edgeB - edgeA + 360) % 360;
  const toContains = (contains - edgeA + 360) % 360;
  const containsClockwise = toContains <= clockwise + 1e-6;
  const start = containsClockwise ? edgeA : edgeB;
  const sweep = containsClockwise ? clockwise : (edgeA - edgeB + 360) % 360;
  if (sweep < 0.05 || sweep > 359.95) return null;
  return { start, sweep };
}

export function azimuthInFan(azimuth: number, fan: AzimuthFan): boolean {
  const delta = (azimuth - fan.start + 360) % 360;
  return delta <= fan.sweep + 1e-4;
}

export function buildSolarModel(input: {
  year: number;
  dayIndex: number;
  latitude: number;
  longitude: number;
}): SolarModel {
  const date = dateFromDayIndex(input.year, input.dayIndex);
  const seasons = seasonalDates(input.year, input.latitude, input.longitude);
  const selectedNoon = noonPosition(date, input.latitude, input.longitude);
  const marchNoon = noonPosition(seasons.march, input.latitude, input.longitude);
  const septemberNoon = noonPosition(seasons.september, input.latitude, input.longitude);
  const equinoxDate =
    separation(selectedNoon, septemberNoon) < separation(selectedNoon, marchNoon)
      ? seasons.september
      : seasons.march;
  const references = [
    {
      id: "summer" as const,
      name: "Summer solstice",
      date: seasons.summer,
      color: ARC_COLORS.summer,
    },
    {
      id: "equinox" as const,
      name: "Equinox",
      date: equinoxDate,
      color: ARC_COLORS.equinox,
    },
    {
      id: "winter" as const,
      name: "Winter solstice",
      date: seasons.winter,
      color: ARC_COLORS.winter,
    },
  ];

  const match = references.find((ref) =>
    samePath(selectedNoon, noonPosition(ref.date, input.latitude, input.longitude)),
  );

  const arcs = references
    .filter((ref) => ref !== match)
    .map((ref) =>
      makeArc(
        ref.id,
        ref.name,
        formatMonthDay(ref.date),
        ref.color,
        ref.date,
        input.latitude,
        input.longitude,
        false,
      ),
    );

  arcs.push(
    makeArc(
      "selected",
      match ? match.name : "Selected day",
      formatMonthDay(date),
      match ? match.color : ARC_COLORS.selected,
      date,
      input.latitude,
      input.longitude,
      true,
    ),
  );

  const times = getTimes(date, input.latitude, input.longitude);
  const dayLengthMs =
    times.sunrise && times.sunset
      ? times.sunset.getTime() - times.sunrise.getTime()
      : null;

  let note: string | null = null;
  if (match) {
    note = `${formatMonthDay(date)} follows the ${match.name.toLowerCase()}, so those paths are drawn as one arc.`;
  } else if (times.alwaysDown) {
    note = "Polar night. The sun stays below the horizon on this date.";
  } else if (times.alwaysUp) {
    note = "Midnight sun. The sun stays above the horizon all day.";
  }

  const dayTimes = extractSolarDayTimes(times, dayLengthMs);
  const summerMarks = riseSetAzimuths(seasons.summer, input.latitude, input.longitude);
  const winterMarks = riseSetAzimuths(seasons.winter, input.latitude, input.longitude);
  const marchMarks = riseSetAzimuths(seasons.march, input.latitude, input.longitude);
  const septemberMarks = riseSetAzimuths(seasons.september, input.latitude, input.longitude);

  return {
    date,
    arcs,
    note,
    times: dayTimes,
    horizon: {
      sunriseAzimuth: eventAzimuth(dayTimes.sunrise, input.latitude, input.longitude),
      sunsetAzimuth: eventAzimuth(dayTimes.sunset, input.latitude, input.longitude),
      riseFan: azimuthFan(
        summerMarks.rise,
        winterMarks.rise,
        marchMarks.rise ?? septemberMarks.rise,
      ),
      setFan: azimuthFan(
        summerMarks.set,
        winterMarks.set,
        marchMarks.set ?? septemberMarks.set,
      ),
    },
  };
}

function validDate(value: Date | null | undefined): Date | null {
  return value && !Number.isNaN(value.getTime()) ? value : null;
}

function extractSolarDayTimes(
  times: ReturnType<typeof getTimes>,
  dayLengthMs: number | null,
): SolarDayTimes {
  return {
    sunrise: validDate(times.sunrise),
    sunset: validDate(times.sunset),
    solarNoon: times.solarNoon,
    alwaysUp: Boolean(times.alwaysUp),
    alwaysDown: Boolean(times.alwaysDown),
    dayLengthMs,
    dawn: validDate(times.dawn),
    dusk: validDate(times.dusk),
    nauticalDawn: validDate(times.nauticalDawn),
    nauticalDusk: validDate(times.nauticalDusk),
    nightEnd: validDate(times.nightEnd),
    night: validDate(times.night),
    goldenHourEnd: validDate(times.goldenHourEnd),
    goldenHour: validDate(times.goldenHour),
    blueHourEnd: validDate((times as Record<string, Date | undefined>).blueHourEnd),
    blueHour: validDate((times as Record<string, Date | undefined>).blueHour),
  };
}

const LIGHTING_LABELS: Record<SunLightingPhase, string> = {
  polar_night: "Polar night",
  polar_day: "Midnight sun",
  night: "Night",
  astronomical_twilight: "Astronomical twilight",
  nautical_twilight: "Nautical twilight",
  blue_hour: "Blue hour",
  civil_twilight: "Civil twilight",
  golden_hour: "Golden hour",
  daylight: "Daylight",
};

function lightingHint(phase: SunLightingPhase, morning: boolean | null): string {
  switch (phase) {
    case "polar_night":
      return "Sun stays below the horizon all day";
    case "polar_day":
      return "Sun stays above the horizon all day";
    case "night":
      return "Sun more than 18° below the horizon";
    case "astronomical_twilight":
      return morning === null
        ? "Faint stars begin to fade"
        : morning
          ? "Before nautical dawn"
          : "After nautical dusk";
    case "nautical_twilight":
      return morning === null
        ? "Horizon line visible at sea"
        : morning
          ? "Before civil dawn"
          : "After civil dusk";
    case "blue_hour":
      return morning === null
        ? "Cool twilight glow"
        : morning
          ? "Before sunrise"
          : "After sunset";
    case "civil_twilight":
      return morning === null
        ? "Enough light to see clearly"
        : morning
          ? "Before sunrise"
          : "After sunset";
    case "golden_hour":
      return morning === null
        ? "Warm, low-angle sunlight"
        : morning
          ? "After sunrise"
          : "Before sunset";
    case "daylight":
      return "Direct sunlight, sun above 6°";
    default:
      return "";
  }
}

function phaseInfo(id: SunLightingPhase, morning: boolean | null): SunLightingPhaseInfo {
  return { id, label: LIGHTING_LABELS[id], hint: lightingHint(id, morning) };
}

function meanSolarMinutes(date: Date, longitude: number): number {
  const offsetMs = (longitude / 15) * 3_600_000;
  const local = new Date(date.getTime() + offsetMs);
  return (
    local.getUTCHours() * 60 +
    local.getUTCMinutes() +
    local.getUTCSeconds() / 60 +
    local.getUTCMilliseconds() / 60_000
  );
}

/** Resolve the current sun lighting phase from mean-solar time and daily boundaries. */
export function resolveSunLightingPhase(
  minutes: number,
  times: SolarDayTimes,
  altitude: number,
  longitude: number,
): SunLightingPhaseInfo {
  if (times.alwaysDown) return phaseInfo("polar_night", null);
  if (times.alwaysUp) return phaseInfo("polar_day", null);

  const clock = ((minutes % 1440) + 1440) % 1440;
  const {
    nightEnd,
    night,
    nauticalDawn,
    nauticalDusk,
    dawn,
    dusk,
    blueHourEnd,
    blueHour,
    sunrise,
    sunset,
    goldenHourEnd,
    goldenHour,
  } = times;

  const hasTwilight =
    dawn &&
    dusk &&
    nauticalDawn &&
    nauticalDusk &&
    nightEnd &&
    night &&
    sunrise &&
    sunset;

  if (hasTwilight) {
    const nightEndMin = meanSolarMinutes(nightEnd, longitude);
    const nightMin = meanSolarMinutes(night, longitude);

    if (clock < nightEndMin || clock >= nightMin) return phaseInfo("night", null);
    if (clock < meanSolarMinutes(nauticalDawn, longitude)) {
      return phaseInfo("astronomical_twilight", true);
    }
    if (clock < meanSolarMinutes(dawn, longitude)) return phaseInfo("nautical_twilight", true);
    if (blueHourEnd && clock < meanSolarMinutes(blueHourEnd, longitude)) {
      return phaseInfo("blue_hour", true);
    }
    if (clock < meanSolarMinutes(sunrise, longitude)) return phaseInfo("civil_twilight", true);
    if (goldenHourEnd && clock < meanSolarMinutes(goldenHourEnd, longitude)) {
      return phaseInfo("golden_hour", true);
    }
    if (goldenHour && clock < meanSolarMinutes(goldenHour, longitude)) {
      return phaseInfo("daylight", null);
    }
    if (clock < meanSolarMinutes(sunset, longitude)) return phaseInfo("golden_hour", false);
    if (blueHour && clock < meanSolarMinutes(blueHour, longitude)) {
      return phaseInfo("civil_twilight", false);
    }
    if (clock < meanSolarMinutes(dusk, longitude)) return phaseInfo("blue_hour", false);
    if (clock < meanSolarMinutes(nauticalDusk, longitude)) {
      return phaseInfo("nautical_twilight", false);
    }
    return phaseInfo("astronomical_twilight", false);
  }

  if (altitude >= 6) return phaseInfo("daylight", null);
  if (altitude >= 0) return phaseInfo("golden_hour", null);
  if (altitude >= -4) return phaseInfo("civil_twilight", null);
  if (altitude >= -6) return phaseInfo("blue_hour", null);
  if (altitude >= -12) return phaseInfo("nautical_twilight", null);
  if (altitude >= -18) return phaseInfo("astronomical_twilight", null);
  return phaseInfo("night", null);
}

export function moonPhaseLabel(phase: number, waxing: boolean): string {
  if (phase < 0.03 || phase > 0.97) return "New moon";
  if (phase < 0.22) return waxing ? "Waxing crescent" : "Waning crescent";
  if (phase < 0.28) return waxing ? "First quarter" : "Last quarter";
  if (phase < 0.47) return waxing ? "Waxing gibbous" : "Waning gibbous";
  if (phase < 0.53) return "Full moon";
  if (phase < 0.72) return waxing ? "Waxing gibbous" : "Waning gibbous";
  if (phase < 0.78) return waxing ? "First quarter" : "Last quarter";
  return waxing ? "Waxing crescent" : "Waning crescent";
}

export function buildMoonModel(
  date: Date,
  latitude: number,
  longitude: number,
): MoonModel {
  const path = sampleMoonPath(date, latitude, longitude);
  const times = getMoonTimes(date, latitude, longitude);

  return {
    arc: {
      label: "Moon path",
      detail: formatMonthDay(date),
      color: MOON_ARC_COLOR,
      points: path.points,
      closed: path.closed,
      underPoints: path.underPoints,
      underClosed: path.underClosed,
      emphasized: true,
      apex: apexOf(path.points),
    },
    times: {
      rise: times.rise ?? null,
      set: times.set ?? null,
      alwaysUp: Boolean(times.alwaysUp),
      alwaysDown: Boolean(times.alwaysDown),
    },
  };
}

export function placeMoon(
  date: Date,
  minutes: number,
  latitude: number,
  longitude: number,
): MoonPlacement {
  const instant = instantAtMinutes(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    minutes,
    longitude,
  );
  const position = getMoonPosition(instant, latitude, longitude);
  const illumination = getMoonIllumination(instant);
  const sky = project(position.azimuth, position.altitude, SKY_RADIUS);
  const bearing = project(position.azimuth, 0, SKY_RADIUS);
  bearing.y = 0.05;

  return {
    azimuth: position.azimuth,
    altitude: position.altitude,
    position: sky,
    bearing,
    aboveHorizon: position.altitude > 0,
    fraction: illumination.fraction,
    phase: illumination.phase,
    waxing: illumination.waxing,
    phaseLabel: moonPhaseLabel(illumination.phase, illumination.waxing),
  };
}

export function placeSun(
  date: Date,
  minutes: number,
  latitude: number,
  longitude: number,
  dayTimes?: SolarDayTimes,
): SunPlacement {
  const instant = instantAtMinutes(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    minutes,
    longitude,
  );
  const position = getPosition(instant, latitude, longitude);
  const sky = project(position.azimuth, position.altitude, SKY_RADIUS);
  const bearing = project(position.azimuth, 0, SKY_RADIUS);
  bearing.y = 0.05;

  const times =
    dayTimes ??
    extractSolarDayTimes(getTimes(date, latitude, longitude), null);

  return {
    azimuth: position.azimuth,
    altitude: position.altitude,
    position: sky,
    bearing,
    aboveHorizon: position.altitude > 0,
    shadow:
      position.altitude > 0.15
        ? gnomonShadow(sky, GNOMON_HEIGHT, DISC_RADIUS)
        : null,
    lightingPhase: resolveSunLightingPhase(
      minutes,
      times,
      position.altitude,
      longitude,
    ),
  };
}

/** Where the ray through the gnomon tip meets the ground. */
export function gnomonShadow(
  sun: Vec3,
  height: number,
  discRadius: number,
): Vec3 | null {
  if (sun.y <= height) return null;
  const t = -sun.y / (height - sun.y);
  let x = sun.x + t * (0 - sun.x);
  let z = sun.z + t * (0 - sun.z);
  const length = Math.hypot(x, z);
  const max = discRadius * 0.97;
  if (length > max) {
    x *= max / length;
    z *= max / length;
  }
  return { x, y: 0.045, z };
}

export function altitudeSamples(
  date: Date,
  latitude: number,
  longitude: number,
): AltitudeSample[] {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const samples: AltitudeSample[] = [];
  for (let minute = 0; minute <= 1440; minute += SAMPLE_MINUTES) {
    const instant = instantAtMinutes(year, month, day, minute, longitude);
    samples.push({
      minute,
      sunAltitude: getPosition(instant, latitude, longitude).altitude,
      moonAltitude: getMoonPosition(instant, latitude, longitude).altitude,
    });
  }
  return samples;
}

/** Mean-solar minutes after midnight of `day`. Outside [0, 1439] the event belongs to another date. */
export function seekMinute(
  instant: Date | null,
  day: Date,
  longitude: number,
): number | null {
  if (!instant || Number.isNaN(instant.getTime())) return null;
  const midnight = instantAtMinutes(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    0,
    longitude,
  );
  const minutes = (instant.getTime() - midnight.getTime()) / 60_000;
  if (minutes < 0 || minutes > 1439) return null;
  return minutes;
}

export function shadowLengthMeters(altitudeDeg: number, heightMeters: number): number | null {
  if (!(altitudeDeg > 0.15) || !(heightMeters > 0)) return null;
  const meters = heightMeters / Math.tan(altitudeDeg * DEG);
  if (!Number.isFinite(meters) || meters < 0) return null;
  return meters;
}

export function formatShadow(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "—";
  if (meters > 999) return "999+ m";
  if (meters < 10) return `${meters.toFixed(1)} m`;
  return `${Math.round(meters)} m`;
}
