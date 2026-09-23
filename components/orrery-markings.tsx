"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { bodyById, maxOrrerySceneRadius, type OrreryModel } from "@/lib/orrery";
import {
  formatDeltaJ2000,
  formatHeliocentricLongitude,
  formatJulianDate,
} from "@/lib/format";

const ECLIPTIC_TICK_LONGITUDES = [0, 90, 180, 270] as const;

export type OrreryMarkingsTheme = "night" | "davinci";

export interface OrreryMarkingsProps {
  model: OrreryModel;
  theme: OrreryMarkingsTheme;
}

function eclipticPoint(longitudeDeg: number, radius: number): [number, number, number] {
  const angle = (longitudeDeg * Math.PI) / 180;
  return [radius * Math.cos(angle), 0, radius * Math.sin(angle)];
}

export function OrreryMarkings({ model, theme }: OrreryMarkingsProps) {
  const ringRadius = maxOrrerySceneRadius() * 0.92;
  const isNight = theme === "night";
  const ink = "#3a2412";
  const lineColor = isNight ? "#c8d4e8" : ink;
  const lineOpacity = isNight ? 0.15 : 0.22;
  const tickOpacity = isNight ? 0.28 : 0.38;

  const ringPoints = useMemo(() => {
    const segments = 160;
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      points.push(eclipticPoint((i / segments) * 360, ringRadius));
    }
    return points;
  }, [ringRadius]);

  const tickSegments = useMemo(() => {
    const inner = ringRadius * 0.97;
    const outer = ringRadius * 1.03;
    const pairs: [number, number, number][] = [];
    for (const longitude of ECLIPTIC_TICK_LONGITUDES) {
      const a = eclipticPoint(longitude, inner);
      const b = eclipticPoint(longitude, outer);
      pairs.push(a, b);
    }
    return pairs;
  }, [ringRadius]);

  const earth = bodyById(model, "earth");
  const plaquePosition = eclipticPoint(270, ringRadius * 0.88);
  plaquePosition[1] = -0.15;

  const epochPosition = eclipticPoint(45, ringRadius * 1.04);
  epochPosition[1] = 0.08;

  return (
    <group>
      <Line
        points={ringPoints}
        color={lineColor}
        transparent
        opacity={lineOpacity}
        lineWidth={1}
      />
      <Line
        points={tickSegments}
        segments
        color={lineColor}
        transparent
        opacity={tickOpacity}
        lineWidth={isNight ? 1.2 : 1.4}
      />
      {ECLIPTIC_TICK_LONGITUDES.map((longitude) => {
        const labelPos = eclipticPoint(longitude, ringRadius * 1.08);
        return (
          <Html
            key={longitude}
            position={labelPos}
            center
            distanceFactor={22}
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className={
                isNight
                  ? "text-[9px] tracking-[0.08em] text-white/45"
                  : "text-[9px] tracking-[0.08em] text-[#3a2310]/55"
              }
            >
              {longitude}°
            </span>
          </Html>
        );
      })}
      <Html
        position={epochPosition}
        center
        distanceFactor={24}
        zIndexRange={[8, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span
          className={
            isNight
              ? "text-[8px] tracking-[0.18em] text-white/30 uppercase"
              : "text-[8px] tracking-[0.18em] text-[#3a2310]/40 uppercase italic"
          }
        >
          Epoch J2000.0
        </span>
      </Html>
      <Html
        position={plaquePosition}
        center
        distanceFactor={20}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={
            isNight
              ? "rounded-md border border-white/20 bg-black/60 px-2.5 py-1.5 text-[9px] leading-relaxed tracking-[0.06em] text-white/85 backdrop-blur-sm"
              : "rounded-md border border-[#9b764b]/60 bg-[#f4e8d1]/90 px-2.5 py-1.5 text-[9px] leading-relaxed tracking-[0.06em] text-[#3a2310]/90"
          }
        >
          <div>{formatJulianDate(model.instant)}</div>
          <div className={isNight ? "text-white/70" : "text-[#3a2310]/75"}>
            {formatDeltaJ2000(model.instant)}
          </div>
          {earth && (
            <div className={isNight ? "text-white/60" : "text-[#3a2310]/65"}>
              {formatHeliocentricLongitude(earth.heliocentricLongitudeDeg)}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
