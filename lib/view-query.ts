import {
  isoFromDate,
  minutesToTimeValue,
  parseCoordinate,
  parseIsoDate,
  timeValueToMinutes,
} from "./solar.ts";

export interface ParsedView {
  latitude?: number;
  longitude?: number;
  year?: number;
  dayIndex?: number;
  minutes?: number;
  objectHeight?: number;
}

type QueryValue = string | string[] | undefined;

function first(params: Record<string, QueryValue>, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseViewQuery(params: Record<string, QueryValue>): ParsedView {
  const parsed: ParsedView = {};
  const lat = first(params, "lat");
  if (lat !== undefined) {
    const value = parseCoordinate(lat, -90, 90);
    if (value !== null) parsed.latitude = value;
  }
  const lng = first(params, "lng");
  if (lng !== undefined) {
    const value = parseCoordinate(lng, -180, 180);
    if (value !== null) parsed.longitude = value;
  }
  const date = first(params, "date");
  if (date !== undefined) {
    const value = parseIsoDate(date);
    if (value) {
      parsed.year = value.year;
      parsed.dayIndex = value.dayIndex;
    }
  }
  const time = first(params, "time");
  if (time !== undefined) {
    const value = timeValueToMinutes(time);
    if (value !== null) parsed.minutes = value;
  }
  const height = first(params, "h");
  if (height !== undefined && /^-?\d+(\.\d+)?$/.test(height.trim())) {
    const value = Number(height);
    if (value >= 0.1 && value <= 100) parsed.objectHeight = value;
  }
  return parsed;
}

function trimNumber(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

export function serializeViewQuery(view: {
  latitude: number;
  longitude: number;
  date: Date;
  minutes: number;
  objectHeight: number;
}): string {
  const minutes = ((Math.round(view.minutes) % 1440) + 1440) % 1440;
  const params = new URLSearchParams();
  params.set("lat", trimNumber(view.latitude));
  params.set("lng", trimNumber(view.longitude));
  params.set("date", isoFromDate(view.date));
  params.set("time", minutesToTimeValue(minutes));
  params.set("h", trimNumber(view.objectHeight));
  return params.toString();
}
