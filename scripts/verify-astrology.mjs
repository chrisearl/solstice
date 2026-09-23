import assert from "node:assert/strict";
import test from "node:test";
import {
  ascendantFromAngles,
  greenwichSiderealDeg,
  isRetrogradeMotion,
  matchAspect,
  midheavenFromAngles,
  zodiacAt,
} from "../lib/astrology.ts";
import { formatChartReading, formatSignDegree } from "../lib/format.ts";
import { bodyById, buildOrreryModel, chartById } from "../lib/orrery.ts";

function modelAt(isoDate, minutes = 720, latitude) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, 0, 1));
  const dayIndex = Math.floor((date - start) / 86_400_000);
  return buildOrreryModel({
    clock: { year, dayIndex, minutes },
    longitude: -81.3792,
    latitude,
  });
}

function angularDelta(a, b) {
  let delta = Math.abs(a - b) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta;
}

test("tropical signs are equal 30° houses from Aries", () => {
  const aries = zodiacAt(15);
  assert.equal(aries.sign.name, "Aries");
  assert.equal(aries.sign.glyph, "♈");
  assert.ok(Math.abs(aries.degreeInSign - 15) < 1e-9);

  const cancer = zodiacAt(90);
  assert.equal(cancer.sign.name, "Cancer");
  assert.ok(cancer.degreeInSign < 1e-9);

  const pisces = zodiacAt(359.5);
  assert.equal(pisces.sign.name, "Pisces");
  assert.equal(formatSignDegree(pisces), "29°30′");
});

test("sun geocentric longitude sits opposite Earth's heliocentric longitude", () => {
  const model = modelAt("2024-06-21");
  const earth = bodyById(model, "earth");
  const sun = chartById(model, "sun");
  assert.ok(earth && sun);
  const expected = (earth.heliocentricLongitudeDeg + 180) % 360;
  assert.ok(
    angularDelta(sun.zodiac.longitudeDeg, expected) < 0.05,
    `sun ${sun.zodiac.longitudeDeg} vs earth+180 ${expected}`,
  );
  assert.equal(sun.retrograde, false);
  assert.equal(earth.chart, null);
});

test("solstices and equinoxes land on the cardinal signs", () => {
  const checks = [
    { date: "2024-03-20", sign: "Aries", longitude: 0 },
    { date: "2024-06-21", sign: "Cancer", longitude: 90 },
    { date: "2024-09-22", sign: "Libra", longitude: 180 },
    { date: "2024-12-21", sign: "Capricorn", longitude: 270 },
  ];
  for (const row of checks) {
    const sun = chartById(modelAt(row.date), "sun");
    assert.ok(sun);
    assert.ok(
      angularDelta(sun.zodiac.longitudeDeg, row.longitude) <= 3,
      `${row.date}: sun ${sun.zodiac.longitudeDeg.toFixed(1)}° expected ~${row.longitude}°`,
    );
    const placed = zodiacAt(row.longitude);
    assert.equal(placed.sign.name, row.sign);
  }
});

test("retrograde is backward geocentric motion", () => {
  assert.equal(isRetrogradeMotion(10, 8), true);
  assert.equal(isRetrogradeMotion(358, 2), false);
  assert.equal(isRetrogradeMotion(2, 358), true);
});

test("Mercury is retrograde on some days of 2024 and direct on others", () => {
  let retrograde = 0;
  for (let day = 0; day < 365; day++) {
    const model = buildOrreryModel({
      clock: { year: 2024, dayIndex: day, minutes: 720 },
      longitude: 0,
    });
    if (chartById(model, "mercury")?.retrograde) retrograde += 1;
  }
  assert.ok(retrograde > 40 && retrograde < 120, `Mercury retrograde days: ${retrograde}`);
});

test("major aspects use the usual orbs", () => {
  assert.equal(matchAspect(0, 2)?.kind, "conjunction");
  assert.equal(matchAspect(0, 60)?.kind, "sextile");
  assert.equal(matchAspect(10, 100)?.kind, "square");
  assert.equal(matchAspect(0, 120)?.kind, "trine");
  assert.equal(matchAspect(0, 180)?.kind, "opposition");
  assert.equal(matchAspect(0, 40), null);
});

test("chart aspects are ordered by tightness of orb", () => {
  const model = modelAt("2024-06-21");
  assert.ok(model.aspects.length > 0);
  for (let i = 1; i < model.aspects.length; i++) {
    assert.ok(model.aspects[i].orbDeg >= model.aspects[i - 1].orbDeg);
  }
});

test("sidereal time and angles at the equator", () => {
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  assert.ok(Math.abs(greenwichSiderealDeg(j2000) - 280.46061837) < 1e-6);
  assert.ok(Math.abs(ascendantFromAngles(0, 0, 23.439291) - 90) < 1e-6);
  assert.ok(Math.abs(midheavenFromAngles(0, 23.439291)) < 1e-6);
  assert.ok(Math.abs(ascendantFromAngles(90, 0, 23.439291) - 180) < 1e-4);
});

test("houses appear only when a latitude is supplied", () => {
  const bare = modelAt("2024-06-21");
  assert.equal(bare.houses, null);
  const placed = modelAt("2024-06-21", 720, 28.5383);
  assert.ok(placed.houses);
  assert.equal(placed.houses.ascendant.sign.name.length > 0, true);
  assert.ok(Number.isFinite(placed.houses.midheaven.longitudeDeg));
  const sun = chartById(placed, "sun");
  assert.ok(sun);
  assert.match(formatChartReading(sun), new RegExp(sun.zodiac.sign.name));
  assert.match(formatChartReading(sun), /°/);
});
