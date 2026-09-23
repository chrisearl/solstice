import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_PLANET_IDS,
  buildOrreryModel,
  buildOrbitPaths,
  bodyById,
  distanceAu,
  heliocentricLongitudeDeg,
  orbitalPeriodDays,
  sceneRadiusFromAu,
} from "../lib/orrery.ts";

function modelAt(isoDate, minutes = 720) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, 0, 1));
  const dayIndex = Math.floor((date - start) / 86_400_000);
  return buildOrreryModel({
    clock: { year, dayIndex, minutes },
    longitude: -81.3792,
  });
}

function earthLongitude(model) {
  const earth = bodyById(model, "earth");
  assert.ok(earth);
  return earth.heliocentricLongitudeDeg;
}

test("orrery includes sun, eight planets, and moon", () => {
  const model = modelAt("2024-06-21");
  const ids = model.bodies.map((body) => body.id).sort();
  assert.deepEqual(ids, [
    "earth",
    "jupiter",
    "mars",
    "mercury",
    "moon",
    "neptune",
    "saturn",
    "sun",
    "uranus",
    "venus",
  ]);
});

test("log-scale keeps Mars farther from origin than Earth", () => {
  const model = modelAt("2024-06-21");
  const earth = bodyById(model, "earth");
  const mars = bodyById(model, "mars");
  assert.ok(earth && mars);
  const earthR = distanceAu(earth.position);
  const marsR = distanceAu(mars.position);
  assert.ok(marsR > earthR, `Mars scene radius ${marsR} should exceed Earth ${earthR}`);
});

test("log-scale mapping is monotonic in AU", () => {
  assert.ok(sceneRadiusFromAu(1) < sceneRadiusFromAu(5));
  assert.ok(sceneRadiusFromAu(5) < sceneRadiusFromAu(30));
});

test("Earth longitude near JPL spot checks (±3°)", () => {
  /** Heliocentric ecliptic longitude; vernal equinox places Earth opposite the Sun from 0°. */
  const checks = [
    { date: "2024-03-20", expected: 180, label: "vernal equinox 2024" },
    { date: "2024-06-21", expected: 270, label: "summer solstice 2024" },
    { date: "2024-01-03", expected: 103, label: "near perihelion 2024" },
    { date: "2000-03-20", expected: 180, label: "vernal equinox 2000" },
  ];
  for (const row of checks) {
    const model = modelAt(row.date);
    const lon = earthLongitude(model);
    let delta = Math.abs(lon - row.expected);
    if (delta > 180) delta = 360 - delta;
    assert.ok(
      delta <= 3,
      `${row.label}: expected ~${row.expected}°, got ${lon.toFixed(1)}° (Δ${delta.toFixed(1)}°)`,
    );
  }
});

test("Moon orbital phase advances over ~27 days", () => {
  const start = modelAt("2024-01-01", 720);
  const end = modelAt("2024-01-28", 720);
  const moonStart = bodyById(start, "moon");
  const moonEnd = bodyById(end, "moon");
  assert.ok(moonStart && moonEnd);
  let delta = moonEnd.orbitalPhase - moonStart.orbitalPhase;
  if (delta < 0) delta += 1;
  assert.ok(delta > 0.7, `Moon should advance most of an orbit, got ${delta.toFixed(2)}`);
});

test("all planets have positive heliocentric distances", () => {
  const model = modelAt("2024-09-23");
  for (const id of ALL_PLANET_IDS) {
    const body = bodyById(model, id);
    assert.ok(body);
    assert.ok(body.distanceAu > 0, `${id} distance should be positive`);
    assert.ok(Number.isFinite(body.heliocentricLongitudeDeg));
  }
});

test("heliocentric longitude helper matches body placement", () => {
  const model = modelAt("2024-12-21");
  const earth = bodyById(model, "earth");
  assert.ok(earth);
  const lon = heliocentricLongitudeDeg(earth.truePositionAu);
  assert.ok(Math.abs(lon - earth.heliocentricLongitudeDeg) < 0.01);
});

test("orbital period helper matches one Earth year", () => {
  const earth = { n: 0.98564736 };
  const period = orbitalPeriodDays(earth);
  assert.ok(Math.abs(period - 365.25) < 0.5, `Earth period should be ~365 days, got ${period}`);
});

test("planet orbit paths close after one full period", () => {
  const paths = buildOrbitPaths(96);
  for (const path of paths) {
    if (path.id === "moon") continue;
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    const gap = Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z);
    assert.ok(gap < 0.08, `${path.id} orbit should close, gap=${gap.toFixed(3)}`);
  }
});
