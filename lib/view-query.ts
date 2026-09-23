import {
  isoFromDate,
  minutesToTimeValue,
  parseCoordinate,
  parseIsoDate,
  timeValueToMinutes,
} from "./format.ts";

export interface ParsedView {
  latitude?: number;
  longitude?: number;
  year?: number;
  dayIndex?: number;
  minutes?: number;
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
}): string {
  const minutes = ((Math.round(view.minutes) % 1440) + 1440) % 1440;
  const params = new URLSearchParams();
  params.set("lat", trimNumber(view.latitude));
  params.set("lng", trimNumber(view.longitude));
  params.set("date", isoFromDate(view.date));
  params.set("time", minutesToTimeValue(minutes));
  return params.toString();
}

/**
 * History state to reuse when the address bar should change without a navigation.
 * Next.js patches `history.replaceState` and, for any state it does not already
 * own, dispatches an App Router restore. This page reads `searchParams`, so that
 * restore refetches the document. Playback rewrites the query many times a
 * second; those refetches fail the tab on iOS ("This page couldn't load").
 * Reusing the current `__NA` entry updates the query string only.
 */
export function viewHistoryState(current: unknown): object | null {
  if (!current || typeof current !== "object") return null;
  if (!("__NA" in current) || (current as { __NA?: unknown }).__NA !== true) return null;
  return current;
}
