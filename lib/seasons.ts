/**
 * Equinox and solstice instants from Jean Meeus, Astronomical Algorithms, chapter 27.
 * The polynomial covers years 1000–3000. Periodic terms bring the result to about a minute.
 * The result is Terrestrial Time converted to UTC with a short ΔT estimate.
 */

export type SeasonName = "march" | "june" | "september" | "december";

const PERIODIC_TERMS: ReadonlyArray<readonly [number, number, number]> = [
  [485, 324.96, 1934.136],
  [203, 337.23, 32964.467],
  [199, 342.08, 20.186],
  [182, 27.85, 445267.112],
  [156, 73.14, 45036.886],
  [136, 171.52, 22518.443],
  [77, 222.54, 65928.934],
  [74, 296.72, 3034.906],
  [70, 243.58, 9037.513],
  [58, 119.81, 33718.147],
  [52, 297.17, 150.678],
  [50, 21.02, 2281.226],
  [45, 247.54, 29929.562],
  [44, 325.15, 31555.956],
  [29, 60.93, 4443.417],
  [18, 155.12, 67555.328],
  [17, 288.79, 4562.452],
  [16, 198.04, 62894.029],
  [14, 199.76, 31436.921],
  [12, 95.39, 14577.848],
  [12, 287.11, 31931.756],
  [12, 320.81, 34777.259],
  [9, 227.73, 1222.114],
  [8, 15.45, 16859.074],
];

function polynomial(year: number, kind: SeasonName): number {
  const y = (year - 2000) / 1000;
  const y2 = y * y;
  const y3 = y2 * y;
  const y4 = y3 * y;
  switch (kind) {
    case "march":
      return 2451623.80984 + 365242.37404 * y + 0.05169 * y2 - 0.00411 * y3 - 0.00057 * y4;
    case "june":
      return 2451716.56767 + 365241.62603 * y + 0.00325 * y2 + 0.00888 * y3 - 0.0003 * y4;
    case "september":
      return 2451810.21715 + 365242.01767 * y - 0.11575 * y2 + 0.00337 * y3 + 0.00078 * y4;
    case "december":
      return 2451900.05952 + 365242.74049 * y - 0.06223 * y2 - 0.00823 * y3 + 0.00032 * y4;
  }
}

function periodicDays(jde0: number): number {
  const t = (jde0 - 2451545.0) / 36525;
  const w = ((35999.373 * t - 2.47) * Math.PI) / 180;
  const lambda = 1 + 0.0334 * Math.cos(w) + 0.0007 * Math.cos(2 * w);
  let sum = 0;
  for (const [amplitude, phase, frequency] of PERIODIC_TERMS) {
    sum += amplitude * Math.cos(((phase + frequency * t) * Math.PI) / 180);
  }
  return (0.00001 * sum) / lambda;
}

/** Approximate ΔT (TT − UT) in seconds, NASA polynomial for 2005–2050. */
function deltaTSeconds(year: number): number {
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

export function seasonInstant(year: number, kind: SeasonName): Date {
  const jde0 = polynomial(year, kind);
  const jde = jde0 + periodicDays(jde0);
  const unixMs = (jde - 2440587.5) * 86_400_000 - deltaTSeconds(year) * 1000;
  return new Date(unixMs);
}

export function seasonInstants(year: number): Record<SeasonName, Date> {
  return {
    march: seasonInstant(year, "march"),
    june: seasonInstant(year, "june"),
    september: seasonInstant(year, "september"),
    december: seasonInstant(year, "december"),
  };
}
