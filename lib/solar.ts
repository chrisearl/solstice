import { getPosition, getTimes } from "suncalc";

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
  emphasized: boolean;
  apex: Vec3 | null;
}

export interface SolarModel {
  date: Date;
  arcs: SolarArc[];
  note: string | null;
  times: {
    sunrise: Date | null;
    sunset: Date | null;
    solarNoon: Date;
    alwaysUp: boolean;
    alwaysDown: boolean;
    dayLengthMs: number | null;
  };
}

export interface SunPlacement {
  azimuth: number;
  altitude: number;
  position: Vec3;
  bearing: Vec3;
  aboveHorizon: boolean;
  shadow: Vec3 | null;
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

export function seasonalDates(year: number, latitude: number) {
  const june = new Date(Date.UTC(year, 5, 21));
  const december = new Date(Date.UTC(year, 11, 21));
  const march = new Date(Date.UTC(year, 2, 20));
  const northern = latitude >= 0;
  return {
    summer: northern ? june : december,
    winter: northern ? december : june,
    equinox: march,
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

function samplePath(
  date: Date,
  latitude: number,
  longitude: number,
): { points: Vec3[]; closed: boolean } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const times = getTimes(date, latitude, longitude);
  const stamps: number[] = [];

  for (let minutes = 0; minutes <= 1440; minutes += SAMPLE_MINUTES) {
    stamps.push(instantAtMinutes(year, month, day, minutes, longitude).getTime());
  }
  if (times.sunrise) stamps.push(times.sunrise.getTime());
  if (times.sunset) stamps.push(times.sunset.getTime());
  stamps.sort((a, b) => a - b);

  const samples: Sample[] = stamps.map((ms) => {
    const position = getPosition(new Date(ms), latitude, longitude);
    return {
      ...project(position.azimuth, position.altitude, SKY_RADIUS),
      altitude: position.altitude,
      azimuth: position.azimuth,
    };
  });

  const points: Vec3[] = [];
  for (let i = 0; i < samples.length; i++) {
    const current = samples[i];
    const previous = samples[i - 1];
    if (previous && previous.altitude < 0 && current.altitude >= 0) {
      points.push(horizonPoint(previous, current));
    }
    if (current.altitude >= 0) {
      points.push({ x: current.x, y: current.y, z: current.z });
    } else if (current.altitude >= -0.25) {
      points.push(project(current.azimuth, 0, SKY_RADIUS));
    }
    if (previous && previous.altitude >= 0 && current.altitude < 0) {
      points.push(horizonPoint(previous, current));
    }
  }

  const cleaned = dedupe(points);
  const closed = samples.length > 2 && samples.every((sample) => sample.altitude > 0.4);
  if (closed && cleaned.length > 3) {
    return { points: cleaned.slice(0, -1), closed: true };
  }
  return { points: cleaned, closed: false };
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
    emphasized,
    apex: apexOf(path.points),
  };
}

export function buildSolarModel(input: {
  year: number;
  dayIndex: number;
  latitude: number;
  longitude: number;
}): SolarModel {
  const date = dateFromDayIndex(input.year, input.dayIndex);
  const seasons = seasonalDates(input.year, input.latitude);
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
      date: seasons.equinox,
      color: ARC_COLORS.equinox,
    },
    {
      id: "winter" as const,
      name: "Winter solstice",
      date: seasons.winter,
      color: ARC_COLORS.winter,
    },
  ];

  const selectedNoon = noonPosition(date, input.latitude, input.longitude);
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

  return {
    date,
    arcs,
    note,
    times: {
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon: times.solarNoon,
      alwaysUp: Boolean(times.alwaysUp),
      alwaysDown: Boolean(times.alwaysDown),
      dayLengthMs,
    },
  };
}

export function placeSun(
  date: Date,
  minutes: number,
  latitude: number,
  longitude: number,
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
