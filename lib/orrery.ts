import { dateFromDayIndex } from "./solar.ts";
import type { Vec3 } from "./solar.ts";
import { solarClockInstant, type SolarClock } from "./timeline.ts";

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type BodyId = PlanetId | "moon" | "sun";

export type EarthSeason = "spring" | "summer" | "autumn" | "winter";

export interface BodyPlacement {
  id: BodyId;
  name: string;
  position: Vec3;
  truePositionAu: Vec3;
  distanceAu: number;
  heliocentricLongitudeDeg: number;
  orbitalPhase: number;
  color: string;
  displayRadius: number;
}

export interface OrreryModel {
  instant: Date;
  bodies: BodyPlacement[];
  earthSeason: EarthSeason;
  focusId: PlanetId | "moon";
}

export interface OrbitPath {
  id: PlanetId | "moon";
  points: Vec3[];
}

/** Logarithmic radial scale for classic orrery readability. */
export const ORRERY_LOG_BASE = 2.8;
export const ORRERY_INNER_OFFSET = 0.6;

export const ALL_PLANET_IDS: readonly PlanetId[] = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

export const PLANET_NAMES: Record<PlanetId, string> = {
  mercury: "Mercury",
  venus: "Venus",
  earth: "Earth",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
};

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

interface OrbitalElement {
  id: PlanetId;
  name: string;
  a: number;
  e: number;
  i: number;
  omega: number;
  Omega: number;
  L0: number;
  n: number;
  color: string;
  displayRadius: number;
}

/** J2000.0 mean orbital elements (approximate Keplerian). */
const PLANETS: OrbitalElement[] = [
  {
    id: "mercury",
    name: "Mercury",
    a: 0.387098,
    e: 0.20563,
    i: 7.005,
    omega: 29.124,
    Omega: 48.331,
    L0: 252.25,
    n: 4.09233445,
    color: "#b5b5b5",
    displayRadius: 0.12,
  },
  {
    id: "venus",
    name: "Venus",
    a: 0.723332,
    e: 0.006772,
    i: 3.395,
    omega: 54.884,
    Omega: 76.68,
    L0: 181.979,
    n: 1.60213034,
    color: "#e8cda0",
    displayRadius: 0.18,
  },
  {
    id: "earth",
    name: "Earth",
    a: 1.0,
    e: 0.016709,
    i: 0.0,
    omega: 102.937,
    Omega: 0.0,
    L0: 100.464,
    n: 0.98564736,
    color: "#4a90d9",
    displayRadius: 0.2,
  },
  {
    id: "mars",
    name: "Mars",
    a: 1.523688,
    e: 0.093405,
    i: 1.85,
    omega: 286.502,
    Omega: 49.558,
    L0: 355.433,
    n: 0.52402068,
    color: "#c1440e",
    displayRadius: 0.15,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    a: 5.20256,
    e: 0.048498,
    i: 1.303,
    omega: 273.867,
    Omega: 100.464,
    L0: 34.396,
    n: 0.0830853,
    color: "#c88b3a",
    displayRadius: 0.42,
  },
  {
    id: "saturn",
    name: "Saturn",
    a: 9.55475,
    e: 0.055723,
    i: 2.489,
    omega: 339.392,
    Omega: 113.665,
    L0: 49.954,
    n: 0.033444228,
    color: "#e4d191",
    displayRadius: 0.36,
  },
  {
    id: "uranus",
    name: "Uranus",
    a: 19.21814,
    e: 0.046381,
    i: 0.773,
    omega: 96.998,
    Omega: 74.006,
    L0: 313.238,
    n: 0.011728875,
    color: "#93b8c8",
    displayRadius: 0.28,
  },
  {
    id: "neptune",
    name: "Neptune",
    a: 30.06964,
    e: 0.008586,
    i: 1.77,
    omega: 273.187,
    Omega: 131.784,
    L0: 304.88,
    n: 0.005981027,
    color: "#5b5ddf",
    displayRadius: 0.27,
  },
];

const MOON_ORBIT_AU = 0.00257;
const MOON_PERIOD_DAYS = 27.321661;
const MOON_INCLINATION = 5.145 * DEG;
const MOON_COLOR = "#c8c8c8";
const MOON_DISPLAY_RADIUS = 0.06;
const SUN_COLOR = "#f0b429";
const SUN_DISPLAY_RADIUS = 0.55;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeRadians(value: number): number {
  const tau = Math.PI * 2;
  return ((value % tau) + tau) % tau;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 8; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function heliocentricEcliptic(element: OrbitalElement, daysSinceJ2000: number): Vec3 {
  const L = normalizeRadians((element.L0 + element.n * daysSinceJ2000) * DEG);
  const omega = element.omega * DEG;
  const Omega = element.Omega * DEG;
  const i = element.i * DEG;
  const M = normalizeRadians(L - omega - Omega);
  const E = solveKepler(M, element.e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + element.e) * Math.sin(E / 2),
    Math.sqrt(1 - element.e) * Math.cos(E / 2),
  );
  const r = element.a * (1 - element.e * Math.cos(E));

  const u = omega + nu;
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosu = Math.cos(u);
  const sinu = Math.sin(u);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const xEcl = r * (cosO * cosu - sinO * sinu * cosi);
  const yEcl = r * (sinO * cosu + cosO * sinu * cosi);
  const zEcl = r * sinu * sini;

  return { x: xEcl, y: zEcl, z: yEcl };
}

export function distanceAu(position: Vec3): number {
  return Math.hypot(position.x, position.y, position.z);
}

export function heliocentricLongitudeDeg(position: Vec3): number {
  return normalizeDegrees((Math.atan2(position.z, position.x) * 180) / Math.PI);
}

export function sceneRadiusFromAu(distanceAu: number): number {
  return ORRERY_LOG_BASE * Math.log(1 + distanceAu) + ORRERY_INNER_OFFSET;
}

export function scaleToScene(positionAu: Vec3): Vec3 {
  const distance = distanceAu(positionAu);
  if (distance < 1e-12) return { x: 0, y: 0, z: 0 };
  const scale = sceneRadiusFromAu(distance) / distance;
  return {
    x: positionAu.x * scale,
    y: positionAu.y * scale,
    z: positionAu.z * scale,
  };
}

function moonGeocentric(daysSinceJ2000: number): Vec3 {
  const phase = normalizeRadians(((daysSinceJ2000 / MOON_PERIOD_DAYS) * Math.PI * 2) % (Math.PI * 2));
  const xOrb = MOON_ORBIT_AU * Math.cos(phase);
  const zOrb = MOON_ORBIT_AU * Math.sin(phase);
  const yOrb = zOrb * Math.sin(MOON_INCLINATION);
  const zFlat = zOrb * Math.cos(MOON_INCLINATION);
  return { x: xOrb, y: yOrb, z: zFlat };
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function orbitalPhaseFromLongitude(longitudeDeg: number, element: OrbitalElement): number {
  const L = normalizeDegrees(longitudeDeg);
  const perihelion = normalizeDegrees(element.omega + element.Omega);
  return normalizeDegrees(L - perihelion) / 360;
}

export function earthSeasonFromDayIndex(dayIndex: number, year: number): EarthSeason {
  const date = dateFromDayIndex(year, dayIndex);
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (month < 2 || (month === 2 && day < 20)) return "winter";
  if (month < 5 || (month === 5 && day < 21)) return "spring";
  if (month < 8 || (month === 8 && day < 23)) return "summer";
  if (month < 11 || (month === 11 && day < 21)) return "autumn";
  return "winter";
}

export function daysSinceJ2000(instant: Date): number {
  return (instant.getTime() - J2000_MS) / 86_400_000;
}

export function buildOrreryModel(input: {
  clock: SolarClock;
  longitude: number;
  focusId?: PlanetId | "moon";
  visiblePlanets?: ReadonlySet<PlanetId>;
}): OrreryModel {
  const instant = solarClockInstant(input.clock, input.longitude);
  const days = daysSinceJ2000(instant);
  const focusId = input.focusId ?? "earth";
  const visible = input.visiblePlanets ?? new Set(ALL_PLANET_IDS);

  const heliocentric = new Map<PlanetId, Vec3>();
  for (const element of PLANETS) {
    heliocentric.set(element.id, heliocentricEcliptic(element, days));
  }

  const earthAu = heliocentric.get("earth")!;
  const moonAu = addVec3(earthAu, moonGeocentric(days));
  const bodies: BodyPlacement[] = [];

  bodies.push({
    id: "sun",
    name: "Sun",
    position: { x: 0, y: 0, z: 0 },
    truePositionAu: { x: 0, y: 0, z: 0 },
    distanceAu: 0,
    heliocentricLongitudeDeg: 0,
    orbitalPhase: 0,
    color: SUN_COLOR,
    displayRadius: SUN_DISPLAY_RADIUS,
  });

  for (const element of PLANETS) {
    if (!visible.has(element.id)) continue;
    const truePositionAu = heliocentric.get(element.id)!;
    const dist = distanceAu(truePositionAu);
    const longitude = heliocentricLongitudeDeg(truePositionAu);
    bodies.push({
      id: element.id,
      name: element.name,
      position: scaleToScene(truePositionAu),
      truePositionAu,
      distanceAu: dist,
      heliocentricLongitudeDeg: longitude,
      orbitalPhase: orbitalPhaseFromLongitude(longitude, element),
      color: element.color,
      displayRadius: element.displayRadius,
    });
  }

  const moonLongitude = heliocentricLongitudeDeg(moonAu);
  bodies.push({
    id: "moon",
    name: "Moon",
    position: scaleToScene(moonAu),
    truePositionAu: moonAu,
    distanceAu: distanceAu(moonAu),
    heliocentricLongitudeDeg: moonLongitude,
    orbitalPhase: ((days / MOON_PERIOD_DAYS) % 1 + 1) % 1,
    color: MOON_COLOR,
    displayRadius: MOON_DISPLAY_RADIUS,
  });

  return {
    instant,
    bodies,
    earthSeason: earthSeasonFromDayIndex(input.clock.dayIndex, input.clock.year),
    focusId,
  };
}

export function bodyById(model: OrreryModel, id: BodyId): BodyPlacement | undefined {
  return model.bodies.find((body) => body.id === id);
}

export function maxOrrerySceneRadius(): number {
  const neptune = PLANETS.find((p) => p.id === "neptune")!;
  return sceneRadiusFromAu(neptune.a * 1.05);
}

/** Mean orbital period in days from J2000 mean motion (degrees per day). */
export function orbitalPeriodDays(element: Pick<OrbitalElement, "n">): number {
  return 360 / element.n;
}

export function buildOrbitPaths(segments = 96): OrbitPath[] {
  const paths: OrbitPath[] = [];
  for (const element of PLANETS) {
    const periodDays = orbitalPeriodDays(element);
    const points: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const days = (i / segments) * periodDays;
      const au = heliocentricEcliptic(element, days);
      points.push(scaleToScene(au));
    }
    paths.push({ id: element.id, points });
  }

  const moonPoints: Vec3[] = [];
  const earthElement = PLANETS.find((p) => p.id === "earth")!;
  for (let i = 0; i <= segments; i++) {
    const days = (i / segments) * MOON_PERIOD_DAYS;
    const earthAu = heliocentricEcliptic(earthElement, days);
    const moonAu = addVec3(earthAu, moonGeocentric(days));
    moonPoints.push(scaleToScene(moonAu));
  }
  paths.push({ id: "moon", points: moonPoints });

  return paths;
}

export function orbitalPhaseSamples(input: {
  planetId: PlanetId | "moon";
  year: number;
  longitude: number;
  dayCount: number;
  sampleCount?: number;
}): number[] {
  const count = input.sampleCount ?? 120;
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    const dayIndex = Math.floor((i / (count - 1)) * (input.dayCount - 1));
    const model = buildOrreryModel({
      clock: { year: input.year, dayIndex, minutes: 720 },
      longitude: input.longitude,
      focusId: input.planetId === "moon" ? "moon" : input.planetId,
    });
    const body = bodyById(model, input.planetId);
    samples.push(body?.orbitalPhase ?? 0);
  }
  return samples;
}
