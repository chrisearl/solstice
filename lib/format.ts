import { dayIndexFromUtcDate, PRESETS } from "./solar.ts";

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

export type CoordinateStatus = "valid" | "draft" | "invalid";

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

export function parseIsoDate(iso: string): { year: number; dayIndex: number } | null {
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

export function coordinateStatus(value: string, min: number, max: number): CoordinateStatus {
  const text = value.trim();
  if (text === "" || text === "-" || text === "." || text === "-." || /^-?\d+\.$/.test(text)) {
    return "draft";
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "invalid";
  const n = Number(text);
  if (n < min || n > max) return "invalid";
  return "valid";
}

export function parseCoordinate(value: string, min: number, max: number): number | null {
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

export function formatShadow(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "—";
  if (meters > 999) return "999+ m";
  if (meters < 10) return `${meters.toFixed(1)} m`;
  return `${Math.round(meters)} m`;
}
