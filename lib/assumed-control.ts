import { dateFromDayIndex } from "./solar.ts";

/** Winter solstice, 2112 — Rush, “We have assumed control.” */
export const ASSUMED_CONTROL_YEAR = 2112;
const ASSUMED_CONTROL_MONTH = 11;
const ASSUMED_CONTROL_DAY = 21;

export function isAssumedControlDay(year: number, dayIndex: number): boolean {
  if (year !== ASSUMED_CONTROL_YEAR) return false;
  const date = dateFromDayIndex(year, dayIndex);
  return date.getUTCMonth() === ASSUMED_CONTROL_MONTH && date.getUTCDate() === ASSUMED_CONTROL_DAY;
}
