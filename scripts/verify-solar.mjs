import assert from "node:assert/strict";
import test from "node:test";
import { getPosition, getTimes } from "suncalc";
import {
  buildSolarModel,
  formatMeanTime,
  gnomonShadow,
  placeSun,
  project,
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

test("gnomon shadow falls opposite the sun", () => {
  const sun = project(180, 40, 4.65);
  const shadow = gnomonShadow(sun, 0.62, 5.2);
  assert.ok(shadow);
  assert.ok(shadow.z > 0);
  assert.ok(Math.abs(shadow.x) < 0.2);
});
