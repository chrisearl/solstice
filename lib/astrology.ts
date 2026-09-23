const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export type ZodiacElement = "fire" | "earth" | "air" | "water";
export type ZodiacModality = "cardinal" | "fixed" | "mutable";

export interface ZodiacSign {
  id: string;
  name: string;
  glyph: string;
  element: ZodiacElement;
  modality: ZodiacModality;
  /** Traditional ruler, before the modern outers. */
  ruler: string;
}

export interface ZodiacPlacement {
  sign: ZodiacSign;
  longitudeDeg: number;
  degreeInSign: number;
}

export type AspectKind = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface AspectHit {
  kind: AspectKind;
  glyph: string;
  separationDeg: number;
  orbDeg: number;
}

/** Tropical zodiac, equal 30° signs measured from the vernal equinox. */
export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  { id: "aries", name: "Aries", glyph: "♈", element: "fire", modality: "cardinal", ruler: "Mars" },
  { id: "taurus", name: "Taurus", glyph: "♉", element: "earth", modality: "fixed", ruler: "Venus" },
  { id: "gemini", name: "Gemini", glyph: "♊", element: "air", modality: "mutable", ruler: "Mercury" },
  { id: "cancer", name: "Cancer", glyph: "♋", element: "water", modality: "cardinal", ruler: "Moon" },
  { id: "leo", name: "Leo", glyph: "♌", element: "fire", modality: "fixed", ruler: "Sun" },
  { id: "virgo", name: "Virgo", glyph: "♍", element: "earth", modality: "mutable", ruler: "Mercury" },
  { id: "libra", name: "Libra", glyph: "♎", element: "air", modality: "cardinal", ruler: "Venus" },
  { id: "scorpio", name: "Scorpio", glyph: "♏", element: "water", modality: "fixed", ruler: "Mars" },
  { id: "sagittarius", name: "Sagittarius", glyph: "♐", element: "fire", modality: "mutable", ruler: "Jupiter" },
  { id: "capricorn", name: "Capricorn", glyph: "♑", element: "earth", modality: "cardinal", ruler: "Saturn" },
  { id: "aquarius", name: "Aquarius", glyph: "♒", element: "air", modality: "fixed", ruler: "Saturn" },
  { id: "pisces", name: "Pisces", glyph: "♓", element: "water", modality: "mutable", ruler: "Jupiter" },
] as const;

const ASPECTS: readonly { kind: AspectKind; angle: number; orb: number; glyph: string }[] = [
  { kind: "conjunction", angle: 0, orb: 8, glyph: "☌" },
  { kind: "sextile", angle: 60, orb: 4, glyph: "⚹" },
  { kind: "square", angle: 90, orb: 6, glyph: "□" },
  { kind: "trine", angle: 120, orb: 6, glyph: "△" },
  { kind: "opposition", angle: 180, orb: 8, glyph: "☍" },
];

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Shortest signed travel from `fromDeg` to `toDeg`, in −180…180. */
export function signedLongitudeDelta(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

/** Geocentric longitude falling day over day. Sun and Moon are never retrograde. */
export function isRetrogradeMotion(previousDeg: number, currentDeg: number): boolean {
  return signedLongitudeDelta(previousDeg, currentDeg) < -0.05;
}

export function zodiacAt(longitudeDeg: number): ZodiacPlacement {
  const longitude = normalizeDegrees(longitudeDeg);
  const index = Math.min(ZODIAC_SIGNS.length - 1, Math.floor(longitude / 30));
  const sign = ZODIAC_SIGNS[index]!;
  return {
    sign,
    longitudeDeg: longitude,
    degreeInSign: longitude - index * 30,
  };
}

/** Ecliptic longitude of a sign's center, for labeling the belt. */
export function signCenterLongitude(index: number): number {
  return index * 30 + 15;
}

export function separationDeg(aDeg: number, bDeg: number): number {
  const raw = Math.abs(normalizeDegrees(aDeg) - normalizeDegrees(bDeg));
  return raw > 180 ? 360 - raw : raw;
}

export function matchAspect(aDeg: number, bDeg: number): AspectHit | null {
  const separation = separationDeg(aDeg, bDeg);
  let best: AspectHit | null = null;
  for (const aspect of ASPECTS) {
    const orb = Math.abs(separation - aspect.angle);
    if (orb > aspect.orb) continue;
    if (best && orb >= best.orbDeg) continue;
    best = {
      kind: aspect.kind,
      glyph: aspect.glyph,
      separationDeg: separation,
      orbDeg: orb,
    };
  }
  return best;
}

function daysSinceJ2000(instant: Date): number {
  return (instant.getTime() - J2000_MS) / 86_400_000;
}

/** Greenwich mean sidereal time in degrees (Meeus). */
export function greenwichSiderealDeg(instant: Date): number {
  const d = daysSinceJ2000(instant);
  const t = d / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  return normalizeDegrees(gmst);
}

export function localSiderealDeg(instant: Date, longitudeEast: number): number {
  return normalizeDegrees(greenwichSiderealDeg(instant) + longitudeEast);
}

export function meanObliquityDeg(instant: Date): number {
  const t = daysSinceJ2000(instant) / 36525;
  return 23.439291111 - 0.013004166 * t - 0.0000001639 * t * t + 0.0000005036 * t * t * t;
}

/** Ascendant from local sidereal time, latitude, and obliquity. Latitude is clamped off the poles. */
export function ascendantFromAngles(
  lstDeg: number,
  latitudeDeg: number,
  obliquityDeg: number,
): number {
  const lat = Math.min(89, Math.max(-89, latitudeDeg)) * DEG;
  const lst = lstDeg * DEG;
  const eps = obliquityDeg * DEG;
  const y = Math.cos(lst);
  const x = -(Math.sin(lst) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
  return normalizeDegrees(Math.atan2(y, x) / DEG);
}

export function midheavenFromAngles(lstDeg: number, obliquityDeg: number): number {
  const lst = lstDeg * DEG;
  const eps = obliquityDeg * DEG;
  return normalizeDegrees(Math.atan2(Math.sin(lst), Math.cos(lst) * Math.cos(eps)) / DEG);
}

export function ascendantLongitudeDeg(
  instant: Date,
  latitudeDeg: number,
  longitudeEast: number,
): number {
  return ascendantFromAngles(
    localSiderealDeg(instant, longitudeEast),
    latitudeDeg,
    meanObliquityDeg(instant),
  );
}

export function midheavenLongitudeDeg(instant: Date, longitudeEast: number): number {
  return midheavenFromAngles(localSiderealDeg(instant, longitudeEast), meanObliquityDeg(instant));
}
