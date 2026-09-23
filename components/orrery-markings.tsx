"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { ZODIAC_SIGNS, signCenterLongitude } from "@/lib/astrology";
import { formatChartTag, formatDeltaJ2000, formatJulianDate } from "@/lib/format";
import {
  chartById,
  focusChart,
  maxOrrerySceneRadius,
  type BodyPlacement,
  type OrreryModel,
} from "@/lib/orrery";

const SIGN_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

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
    const pairs: [number, number, number][] = [];
    for (const longitude of SIGN_CUSPS) {
      const cardinal = longitude % 90 === 0;
      const inner = ringRadius * (cardinal ? 0.955 : 0.982);
      const outer = ringRadius * (cardinal ? 1.05 : 1.022);
      pairs.push(eclipticPoint(longitude, inner), eclipticPoint(longitude, outer));
    }
    return pairs;
  }, [ringRadius]);

  const sunChart = chartById(model, "sun");
  const focusChart = model.focusId === "earth" ? null : chartById(model, model.focusId);
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
      {ZODIAC_SIGNS.map((sign, index) => {
        const labelPos = eclipticPoint(signCenterLongitude(index), ringRadius * 1.1);
        return (
          <Html
            key={sign.id}
            position={labelPos}
            center
            distanceFactor={22}
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className={
                isNight
                  ? "text-[13px] leading-none text-white/55"
                  : "text-[13px] leading-none text-[#3a2310]/70"
              }
              title={sign.name}
            >
              {sign.glyph}
            </span>
          </Html>
        );
      })}
      {sunChart && (
        <mesh position={eclipticPoint(sunChart.zodiac.longitudeDeg, ringRadius)}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color={isNight ? "#f0b429" : "#8a5a22"} />
        </mesh>
      )}
      {focusChart && (
        <mesh position={eclipticPoint(focusChart.zodiac.longitudeDeg, ringRadius * 0.985)}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color={isNight ? "#d7e4f5" : "#3a2412"} />
        </mesh>
      )}
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
          {sunChart && (
            <div className={isNight ? "text-white/70" : "text-[#3a2310]/75"}>
              Sun {formatChartTag(sunChart)} {sunChart.zodiac.sign.name}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export function OrreryFocusLabel({
  body,
  model,
  theme,
}: {
  body: BodyPlacement;
  model: OrreryModel;
  theme: OrreryMarkingsTheme;
}) {
  const chart = focusChart(model, body.id);
  const earth = body.id === "earth";
  const detail = chart ? (earth ? `Sun ${formatChartTag(chart)}` : formatChartTag(chart)) : null;
  const isNight = theme === "night";

  return (
    <Html
      position={[body.position.x, body.position.y + 0.5, body.position.z]}
      center
      distanceFactor={14}
      zIndexRange={[12, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span
        className={
          isNight
            ? "block rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-center text-[10px] tracking-[0.14em] text-white uppercase backdrop-blur-sm"
            : "block rounded-full border border-[#9b764b]/60 bg-[#f4e8d1]/90 px-2 py-0.5 text-center text-[10px] tracking-[0.14em] text-[#3a2310] uppercase"
        }
      >
        <span className="block">{body.name}</span>
        {detail && <span className="mt-0.5 block font-normal normal-case tracking-normal">{detail}</span>}
      </span>
    </Html>
  );
}
