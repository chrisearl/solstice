"use client";

import { Html } from "@react-three/drei";
import { formatChartTag, formatSignDegree } from "@/lib/format";
import { chartById, type OrreryModel } from "@/lib/orrery";
import { DISC_RADIUS, project, type MoonPlacement, type SunPlacement } from "@/lib/solar";

export interface HorizonChartProps {
  model: OrreryModel;
  latitude: number;
  sun: SunPlacement;
  moon: MoonPlacement;
  showSun: boolean;
  showMoon: boolean;
  theme: "night" | "davinci";
}

export function HorizonChart({
  model,
  latitude,
  sun,
  moon,
  showSun,
  showMoon,
  theme,
}: HorizonChartProps) {
  const houses = model.houses;
  const sunChart = chartById(model, "sun");
  const moonChart = chartById(model, "moon");
  const ink = theme === "davinci";
  const chip = ink
    ? "rounded-full border border-[#9b764b]/55 bg-[#f4e8d1]/90 px-1.5 py-0.5 text-[10px] text-[#3a2310]"
    : "rounded-full border border-white/15 bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85 backdrop-blur-sm";
  const angle = ink
    ? "text-center text-[9px] leading-tight tracking-[0.14em] text-[#3a2310]/80 uppercase"
    : "text-center text-[9px] leading-tight tracking-[0.14em] text-white/70 uppercase";

  const meridian = project(latitude >= 0 ? 180 : 0, 0, DISC_RADIUS * 0.78);
  const east = project(90, 0, DISC_RADIUS * 0.78);

  return (
    <group>
      {houses && (
        <>
          <AngleLabel
            position={east}
            className={angle}
            kicker="Asc"
            value={`${houses.ascendant.sign.glyph} ${formatSignDegree(houses.ascendant)}`}
          />
          <AngleLabel
            position={meridian}
            className={angle}
            kicker="MC"
            value={`${houses.midheaven.sign.glyph} ${formatSignDegree(houses.midheaven)}`}
          />
        </>
      )}
      {showSun && sunChart && (
        <Html
          position={[sun.position.x, sun.position.y + 0.42, sun.position.z]}
          center
          distanceFactor={12}
          zIndexRange={[18, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={chip}>{formatChartTag(sunChart)}</span>
        </Html>
      )}
      {showMoon && moonChart && (
        <Html
          position={[moon.position.x, moon.position.y + 0.36, moon.position.z]}
          center
          distanceFactor={12}
          zIndexRange={[18, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={chip}>{formatChartTag(moonChart)}</span>
        </Html>
      )}
    </group>
  );
}

function AngleLabel({
  position,
  className,
  kicker,
  value,
}: {
  position: { x: number; y: number; z: number };
  className: string;
  kicker: string;
  value: string;
}) {
  return (
    <Html
      position={[position.x, 0.08, position.z]}
      center
      distanceFactor={16}
      zIndexRange={[14, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className={className}>
        <div>{kicker}</div>
        <div className="normal-case tracking-normal">{value}</div>
      </div>
    </Html>
  );
}
