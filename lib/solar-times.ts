import { addTime, times as sunTimeConfig } from "suncalc";

/** Blue hour boundaries at −4° below the horizon (not included in stock SunCalc). */
export function registerSolarTimes(): void {
  if (!sunTimeConfig.some((row) => row[1] === "blueHourEnd")) {
    addTime(-4, "blueHourEnd", "blueHour");
  }
}

/** Custom SunCalc times registered by `registerSolarTimes`. */
export function customSolarTime(times: object, key: "blueHour" | "blueHourEnd"): Date | undefined {
  const value = (times as Record<string, Date | undefined>)[key];
  return value instanceof Date ? value : undefined;
}
