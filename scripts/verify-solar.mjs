import assert from "node:assert/strict";
import test from "node:test";
import { getPosition, getTimes } from "suncalc";
import { formatAzimuth, formatMeanTime } from "../lib/format.ts";
import { seasonInstants } from "../lib/seasons.ts";
import { parseViewQuery, serializeViewQuery, viewHistoryState } from "../lib/view-query.ts";
import {
  altitudeSamples,
  azimuthInFan,
  buildMoonModel,
  buildSolarModel,
  dateFromDayIndex,
  dayIndexFromUtcDate,
  daysInYear,
  gnomonShadow,
  instantAtMinutes,
  placeMoon,
  placeSun,
  project,
  seekMinute,
  seasonalDates,
  shadowLengthMeters,
} from "../lib/solar.ts";
import {
  advanceSolarClock,
  clockFromInstant,
  initialClock,
  nextOrreryPlaybackSpeed,
  nextPlaybackSpeed,
  ORRERY_PLAYBACK_SPEEDS,
  PLAYBACK_SPEEDS,
} from "../lib/timeline.ts";

const ORLANDO = { lat: 28.5383, lng: -81.3792 };
const MAX_PATH_STEP = 1.5;

function maxStep(points) {
  let max = 0;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const next = points[index];
    max = Math.max(
      max,
      Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z),
    );
  }
  return max;
}

function assertNoLongSteps(points, label) {
  const step = maxStep(points);
  assert.ok(
    step <= MAX_PATH_STEP,
    `${label} has a ${step.toFixed(2)} scene-unit step (max ${MAX_PATH_STEP})`,
  );
}

test("azimuth zero points north and altitude lifts the sun", () => {
  const north = project(0, 0, 1);
  const east = project(90, 0, 1);
  const south = project(180, 0, 1);
  const up = project(0, 90, 4);
  assert.ok(Math.abs(north.x) < 1e-6);
  assert.ok(north.z > 0.99);
  assert.ok(east.x > 0.99);
  assert.ok(Math.abs(east.z) < 1e-6);
  assert.ok(south.z < -0.99);
  assert.ok(up.y > 3.9);
  assert.ok(Math.abs(up.x) < 1e-6);
});

test("Orlando solstice noon altitudes and south azimuth", () => {
  const summer = getTimes(new Date(Date.UTC(2026, 5, 21)), ORLANDO.lat, ORLANDO.lng);
  const winter = getTimes(new Date(Date.UTC(2026, 11, 21)), ORLANDO.lat, ORLANDO.lng);
  const summerPos = getPosition(summer.solarNoon, ORLANDO.lat, ORLANDO.lng);
  const winterPos = getPosition(winter.solarNoon, ORLANDO.lat, ORLANDO.lng);

  assert.ok(summerPos.altitude > 80 && summerPos.altitude < 88, String(summerPos.altitude));
  assert.ok(winterPos.altitude > 34 && winterPos.altitude < 43, String(winterPos.altitude));
  assert.ok(summerPos.altitude > winterPos.altitude + 30);
  assert.ok(Math.abs(summerPos.azimuth - 180) < 8, String(summerPos.azimuth));
  assert.ok(Math.abs(winterPos.azimuth - 180) < 8, String(winterPos.azimuth));
  assert.equal(formatMeanTime(summer.solarNoon, ORLANDO.lng).includes("12:"), true);
});

test("seek lands on the displayed mean-solar clock time", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 264,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  for (const key of ["sunrise", "solarNoon", "sunset"]) {
    const minute = seekMinute(model.times[key], model.date, ORLANDO.lng);
    assert.ok(minute !== null && minute >= 0 && minute < 1440);
    const hours = Math.floor(minute / 60);
    const mins = Math.floor(minute % 60);
    const suffix = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    const clock = `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
    assert.equal(clock, formatMeanTime(model.times[key], ORLANDO.lng));
  }
});

test("selected day builds a sunlit arc and a shadow at 3pm in Orlando", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 171,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  const selected = model.arcs.find((arc) => arc.id === "selected");
  assert.ok(selected);
  assert.ok(selected.points.length > 20);
  assert.ok(selected.underPoints.length > 20);
  assert.ok(selected.underPoints.some((point) => point.y < -1));
  assert.ok(selected.points.every((point) => point.y >= -0.05));
  assert.ok(model.times.sunrise);
  assert.ok(model.times.sunset);
  assert.ok(model.times.dayLengthMs && model.times.dayLengthMs > 12 * 3_600_000);

  const sun = placeSun(model.date, 15 * 60, ORLANDO.lat, ORLANDO.lng);
  assert.ok(sun.aboveHorizon);
  assert.ok(sun.shadow);
  assert.ok(Math.hypot(sun.shadow.x, sun.shadow.z) > 0.2);
});

test("Sydney December noon is high and north of the observer", () => {
  const times = getTimes(new Date(Date.UTC(2026, 11, 21)), -33.8688, 151.2093);
  const position = getPosition(times.solarNoon, -33.8688, 151.2093);
  assert.ok(position.altitude > 70, String(position.altitude));
  const sky = project(position.azimuth, position.altitude, 1);
  assert.ok(sky.z > 0, `expected north, got azimuth ${position.azimuth}`);
});

test("Orlando sun arcs avoid horizon chords through the gnomon", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: dayIndexFromUtcDate(new Date(Date.UTC(2026, 8, 22))),
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });

  for (const arc of model.arcs) {
    assertNoLongSteps(arc.points, `${arc.id} above`);
    assertNoLongSteps(arc.underPoints, `${arc.id} under`);
  }
});

test("moon path and placement stay on the sky dome in Orlando", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 171,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  const moonModel = buildMoonModel(model.date, ORLANDO.lat, ORLANDO.lng);
  assert.ok(moonModel.arc.points.length > 10);
  assert.ok(moonModel.arc.underPoints.length > 10);

  const moon = placeMoon(model.date, 22 * 60, ORLANDO.lat, ORLANDO.lng);
  assert.ok(moon.phaseLabel.length > 0);
  assert.ok(moon.fraction >= 0 && moon.fraction <= 1);
  assert.ok(Math.hypot(moon.position.x, moon.position.y, moon.position.z) > 0.5);
});

test("gnomon shadow falls opposite the sun", () => {
  const sun = project(180, 40, 4.65);
  const shadow = gnomonShadow(sun, 0.62, 5.2);
  assert.ok(shadow);
  assert.ok(shadow.z > 0);
  assert.ok(Math.abs(shadow.x) < 0.2);
});

test("Orlando June lighting phases resolve across the day", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 171,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });

  assert.ok(model.times.dawn);
  assert.ok(model.times.goldenHour);
  assert.ok(model.times.blueHour);

  const nautical = placeSun(model.date, 4 * 60 + 15, ORLANDO.lat, ORLANDO.lng, model.times);
  assert.equal(nautical.lightingPhase.id, "nautical_twilight");

  const morningGold = placeSun(model.date, 5 * 60 + 20, ORLANDO.lat, ORLANDO.lng, model.times);
  assert.equal(morningGold.lightingPhase.id, "golden_hour");

  const midday = placeSun(model.date, 12 * 60, ORLANDO.lat, ORLANDO.lng, model.times);
  assert.equal(midday.lightingPhase.id, "daylight");

  const eveningGold = placeSun(model.date, 18 * 60 + 45, ORLANDO.lat, ORLANDO.lng, model.times);
  assert.equal(eveningGold.lightingPhase.id, "golden_hour");

  const blue = placeSun(model.date, 19 * 60 + 20, ORLANDO.lat, ORLANDO.lng, model.times);
  assert.equal(blue.lightingPhase.id, "blue_hour");
});

test("resolveSunLightingPhase handles polar night", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 355,
    latitude: 64.1466,
    longitude: -21.9426,
  });
  if (!model.times.alwaysDown) return;
  const sun = placeSun(model.date, 12 * 60, 64.1466, -21.9426, model.times);
  assert.equal(sun.lightingPhase.id, "polar_night");
});

test("Orlando summer day has night, daylight, and golden-hour samples", () => {
  const model = buildSolarModel({
    year: 2026,
    dayIndex: 171,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  const samples = altitudeSamples(model.date, ORLANDO.lat, ORLANDO.lng);
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].minute >= samples[i - 1].minute);
    assert.ok(samples[i].minute >= 0 && samples[i].minute <= 1440);
  }
  const noon = samples.find((sample) => sample.minute === 12 * 60);
  assert.ok(noon);
  assert.equal(
    placeSun(model.date, noon.minute, ORLANDO.lat, ORLANDO.lng, model.times).lightingPhase.label,
    "Daylight",
  );
  const nearThree = samples.find((sample) => Math.abs(sample.minute - 3 * 60) <= 8);
  assert.ok(nearThree);
  assert.equal(
    placeSun(model.date, nearThree.minute, ORLANDO.lat, ORLANDO.lng, model.times).lightingPhase
      .label,
    "Night",
  );
  assert.ok(samples.some((sample) => sample.sunAltitude > 0 && sample.sunAltitude <= 6));
});

test("shadow length is the object height over the tangent of altitude", () => {
  assert.ok(Math.abs(shadowLengthMeters(45, 1) - 1) < 1e-9);
  assert.equal(shadowLengthMeters(0.15, 1), null);
  assert.equal(shadowLengthMeters(0, 1), null);
  assert.equal(shadowLengthMeters(-4, 2), null);
});

test("Orlando rise fan spans winter to summer sunrise and contains the equinox", () => {
  const seasons = seasonalDates(2026, ORLANDO.lat, ORLANDO.lng);
  const riseAzimuth = (date) => {
    const times = getTimes(date, ORLANDO.lat, ORLANDO.lng);
    assert.ok(times.sunrise);
    return getPosition(times.sunrise, ORLANDO.lat, ORLANDO.lng).azimuth;
  };
  const summer = riseAzimuth(seasons.summer);
  const winter = riseAzimuth(seasons.winter);
  const equinox = riseAzimuth(seasons.march);
  assert.ok(summer < equinox, `summer ${summer} equinox ${equinox}`);
  assert.ok(winter > equinox, `winter ${winter} equinox ${equinox}`);

  const model = buildSolarModel({
    year: 2026,
    dayIndex: 171,
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  assert.ok(model.horizon.riseFan);
  assert.ok(azimuthInFan(equinox, model.horizon.riseFan));
  assert.ok(model.horizon.sunriseAzimuth != null);
  assert.ok(model.horizon.sunsetAzimuth != null);
  assert.equal(model.arcs.filter((arc) => arc.id === "equinox").length <= 1, true);
});

test("September jump lands on the equinox arc", () => {
  const seasons = seasonalDates(2026, ORLANDO.lat, ORLANDO.lng);
  const model = buildSolarModel({
    year: seasons.september.getUTCFullYear(),
    dayIndex: dayIndexFromUtcDate(seasons.september),
    latitude: ORLANDO.lat,
    longitude: ORLANDO.lng,
  });
  const selected = model.arcs.find((arc) => arc.id === "selected");
  assert.ok(selected);
  assert.equal(selected.label, "Equinox");
  assert.equal(model.arcs.some((arc) => arc.id === "equinox"), false);
});

test("formatAzimuth names the sixteen-point compass", () => {
  assert.equal(formatAzimuth(247.4).endsWith("WSW"), true);
});

test("clockFromInstant round-trips through instantAtMinutes", () => {
  const year = 2026;
  const dayIndex = dayIndexFromUtcDate(new Date(Date.UTC(2026, 5, 21)));
  const minutes = 12 * 60 + 30;
  const date = dateFromDayIndex(year, dayIndex);
  const instant = instantAtMinutes(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    minutes,
    ORLANDO.lng,
  );
  const clock = clockFromInstant(instant, ORLANDO.lng);
  assert.equal(clock.year, year);
  assert.equal(clock.dayIndex, dayIndex);
  assert.ok(Math.abs(clock.minutes - minutes) < 1e-6);
});

test("initialClock keeps a June date when now is September", () => {
  const june = dayIndexFromUtcDate(new Date(Date.UTC(2026, 5, 21)));
  const clock = initialClock(
    { year: 2026, dayIndex: june, minutes: 12 * 60 },
    ORLANDO.lng,
    new Date(Date.UTC(2026, 8, 22, 16, 0)),
  );
  assert.equal(clock.year, 2026);
  assert.equal(clock.dayIndex, june);
  assert.equal(clock.minutes, 12 * 60);
});

test("advanceSolarClock rolls midnight and New Year and blocks at the year ends", () => {
  const june = dayIndexFromUtcDate(new Date(Date.UTC(2026, 5, 21)));
  const nextMorning = advanceSolarClock({ year: 2026, dayIndex: june, minutes: 1430 }, 20);
  assert.equal(nextMorning.blocked, false);
  assert.equal(nextMorning.clock.year, 2026);
  assert.equal(nextMorning.clock.dayIndex, june + 1);
  assert.ok(Math.abs(nextMorning.clock.minutes - 10) < 1e-6);

  const dec31 = dayIndexFromUtcDate(new Date(Date.UTC(2026, 11, 31)));
  const newYear = advanceSolarClock({ year: 2026, dayIndex: dec31, minutes: 1439 }, 2);
  assert.equal(newYear.blocked, false);
  assert.equal(newYear.clock.year, 2027);
  assert.equal(newYear.clock.dayIndex, 0);
  assert.ok(Math.abs(newYear.clock.minutes - 1) < 1e-6);

  const beforeRange = advanceSolarClock({ year: 1900, dayIndex: 0, minutes: 0 }, -1);
  assert.equal(beforeRange.blocked, true);
  assert.deepEqual(beforeRange.clock, { year: 1900, dayIndex: 0, minutes: 0 });

  const lastDay = daysInYear(2112) - 1;
  const afterRange = advanceSolarClock({ year: 2112, dayIndex: lastDay, minutes: 1439 }, 2);
  assert.equal(afterRange.blocked, true);
  assert.deepEqual(afterRange.clock, { year: 2112, dayIndex: lastDay, minutes: 1439 });
});

test("advanceSolarClock can loop the same calendar day at midnight", () => {
  const june = dayIndexFromUtcDate(new Date(Date.UTC(2026, 5, 21)));
  const wrapped = advanceSolarClock({ year: 2026, dayIndex: june, minutes: 1430 }, 20, {
    loopDay: true,
  });
  assert.equal(wrapped.blocked, false);
  assert.equal(wrapped.clock.year, 2026);
  assert.equal(wrapped.clock.dayIndex, june);
  assert.ok(Math.abs(wrapped.clock.minutes - 10) < 1e-6);
});

test("astrolabe playback speeds include Realtime and day-scale presets", () => {
  assert.deepEqual(
    PLAYBACK_SPEEDS.map((speed) => speed.label),
    ["Realtime", "1m", "1hr", "12hr", "1day", "7day"],
  );
  assert.equal(PLAYBACK_SPEEDS[0].realtime, true);
  assert.equal(PLAYBACK_SPEEDS[1].minutesPerSecond, 1);
  assert.equal(PLAYBACK_SPEEDS[2].minutesPerSecond, 60);
  assert.equal(PLAYBACK_SPEEDS[3].minutesPerSecond, 12 * 60);
  assert.equal(PLAYBACK_SPEEDS[4].minutesPerSecond, 1440);
  assert.equal(PLAYBACK_SPEEDS[5].minutesPerSecond, 7 * 1440);
  assert.equal(nextPlaybackSpeed(PLAYBACK_SPEEDS[5]), PLAYBACK_SPEEDS[0]);
});

test("orrery playback speeds include Realtime and year-scale presets", () => {
  assert.deepEqual(
    ORRERY_PLAYBACK_SPEEDS.map((speed) => speed.label),
    ["Realtime", "1d", "1mo", "6mo", "1yr", "5yr"],
  );
  assert.equal(ORRERY_PLAYBACK_SPEEDS[0].realtime, true);
  assert.equal(ORRERY_PLAYBACK_SPEEDS[1].daysPerSecond, 1);
  assert.ok(Math.abs(ORRERY_PLAYBACK_SPEEDS[2].daysPerSecond - 365.25 / 12) < 1e-6);
  assert.ok(Math.abs(ORRERY_PLAYBACK_SPEEDS[3].daysPerSecond - (365.25 / 12) * 6) < 1e-6);
  assert.ok(Math.abs(ORRERY_PLAYBACK_SPEEDS[4].daysPerSecond - 365.25) < 1e-6);
  assert.ok(Math.abs(ORRERY_PLAYBACK_SPEEDS[5].daysPerSecond - 365.25 * 5) < 1e-6);
  assert.equal(nextOrreryPlaybackSpeed(ORRERY_PLAYBACK_SPEEDS[5]), ORRERY_PLAYBACK_SPEEDS[0]);
});

test("view query round-trips place, date, and time", () => {
  const parsed = parseViewQuery({
    lat: "27.6936",
    lng: "-97.5195",
    date: "2026-09-22",
    time: "14:05",
    h: "12",
  });
  assert.equal(parsed.latitude, 27.6936);
  assert.equal(parsed.longitude, -97.5195);
  assert.equal(parsed.minutes, 14 * 60 + 5);
  assert.equal("objectHeight" in parsed, false);
  const date = dateFromDayIndex(parsed.year, parsed.dayIndex);
  const serialized = serializeViewQuery({
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    date,
    minutes: parsed.minutes,
  });
  assert.equal(serialized.includes("h="), false);
  const again = parseViewQuery(Object.fromEntries(new URLSearchParams(serialized)));
  assert.equal(again.latitude, parsed.latitude);
  assert.equal(again.longitude, parsed.longitude);
  assert.equal(again.year, parsed.year);
  assert.equal(again.dayIndex, parsed.dayIndex);
  assert.equal(again.minutes, parsed.minutes);

  const partial = parseViewQuery({ lat: "nope", date: "2026-09-22" });
  assert.equal(partial.latitude, undefined);
  assert.equal(partial.year, 2026);
  assert.ok(partial.dayIndex != null);
});

test("view url updates reuse the app-router history entry", () => {
  // A future Next.js history-state shape must keep returning null unless it is
  // the App Router entry. Reusing any other state refetches this page.
  const entry = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { renderedSearch: "" } };
  assert.equal(viewHistoryState(entry), entry);
  assert.equal(viewHistoryState(null), null);
  assert.equal(viewHistoryState(undefined), null);
  assert.equal(viewHistoryState({}), null);
  assert.equal(viewHistoryState({ __NA: false }), null);
});

test("2026 season instants match the USNO calendar days", () => {
  const seasons = seasonInstants(2026);
  const day = (date) => date.toISOString().slice(0, 10);
  assert.equal(day(seasons.march), "2026-03-20");
  assert.equal(day(seasons.june), "2026-06-21");
  assert.equal(day(seasons.september), "2026-09-23");
  assert.equal(day(seasons.december), "2026-12-21");
  assert.ok(Math.abs(seasons.march.getUTCHours() * 60 + seasons.march.getUTCMinutes() - (14 * 60 + 46)) <= 2);
  assert.ok(Math.abs(seasons.june.getUTCHours() * 60 + seasons.june.getUTCMinutes() - (8 * 60 + 24)) <= 2);
  assert.ok(Math.abs(seasons.september.getUTCHours() * 60 + seasons.september.getUTCMinutes() - 5) <= 2);
  assert.ok(Math.abs(seasons.december.getUTCHours() * 60 + seasons.december.getUTCMinutes() - (20 * 60 + 50)) <= 2);

  const sydney = seasonalDates(2026, -33.8688, 151.2093);
  assert.equal(sydney.winter.getUTCMonth(), 5);
});
