"use client";

import { createContext, useContext, type RefObject } from "react";
import { buildOrreryModel, type OrreryModel, type PlanetId } from "@/lib/orrery";
import { dateFromDayIndex, placeMoon, placeSun, type MoonPlacement, type SunPlacement } from "@/lib/solar";
import type { SolarClock } from "@/lib/timeline";

export interface SolarMotionRefs {
  clock: RefObject<SolarClock>;
  latitude: RefObject<number>;
  longitude: RefObject<number>;
  playing: RefObject<boolean>;
}

const SolarMotionContext = createContext<SolarMotionRefs | null>(null);

export function SolarMotionProvider({
  value,
  children,
}: {
  value: SolarMotionRefs;
  children: React.ReactNode;
}) {
  return <SolarMotionContext.Provider value={value}>{children}</SolarMotionContext.Provider>;
}

export function useSolarMotion(): SolarMotionRefs {
  const value = useContext(SolarMotionContext);
  if (!value) {
    throw new Error("Solar motion is only available inside the studio.");
  }
  return value;
}

export function readLiveBodies(motion: SolarMotionRefs): {
  sun: SunPlacement;
  moon: MoonPlacement;
} {
  const clock = motion.clock.current;
  const date = dateFromDayIndex(clock.year, clock.dayIndex);
  const latitude = motion.latitude.current;
  const longitude = motion.longitude.current;
  return {
    sun: placeSun(date, clock.minutes, latitude, longitude),
    moon: placeMoon(date, clock.minutes, latitude, longitude),
  };
}

export function readLiveOrrery(
  motion: SolarMotionRefs,
  focusId: PlanetId | "moon",
  visiblePlanets?: ReadonlySet<PlanetId>,
): OrreryModel {
  return buildOrreryModel({
    clock: motion.clock.current,
    longitude: motion.longitude.current,
    latitude: motion.latitude.current,
    focusId,
    visiblePlanets,
  });
}
