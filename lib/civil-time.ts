import tzLookup from "tz-lookup";

export function timezoneAt(latitude: number, longitude: number): string | null {
  try {
    const zone = tzLookup(latitude, longitude);
    return zone || null;
  } catch {
    return null;
  }
}

export function resolveTimeZone(latitude: number, longitude: number): string {
  return timezoneAt(latitude, longitude) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatCivilClock(instant: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(instant);
  } catch {
    return null;
  }
}

export function formatCivilTime(instant: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(instant);
  } catch {
    return null;
  }
}
