import assert from "node:assert/strict";
import test from "node:test";
import { getPosition, getTimes } from "suncalc";
import {
  buildMoonModel,
  buildSolarModel,
  formatMeanTime,
  gnomonShadow,
  placeMoon,
  placeSun,
  project,
  resolveSunLightingPhase,
} from "../lib/solar.ts";

const ORLANDO = { lat: 28.5383, lng: -81.3792 };

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
