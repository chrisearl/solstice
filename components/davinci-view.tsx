"use client";

import { Cinzel, IM_Fell_English, Nanum_Pen_Script } from "next/font/google";
import { useState } from "react";
import { DavinciScene } from "@/components/davinci-scene";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const nanumPen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
});

interface DavinciViewProps {
  active: boolean;
}

export default function DavinciView({ active }: DavinciViewProps) {
  const [density, setDensity] = useState(35);
  const [weight, setWeight] = useState(1.2);
  const [lightAngle, setLightAngle] = useState(45);
  const [showRings, setShowRings] = useState(true);
  const [motion, setMotion] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#dfcdad] text-[#36220f] select-none ${imFell.className}`}>
      <DavinciScene
        active={active}
        density={density}
        weight={weight}
        lightAngle={lightAngle}
        showRings={showRings}
        motion={motion}
      />
      <div className="davinci-vignette" />
      <div className="davinci-paper" />

      <header className="pointer-events-none absolute top-4 left-6 z-10 max-w-[min(36rem,calc(100%-2rem))]">
        <div className="border-b border-[#6c4826]/40 pb-2">
          <h1
            className={`${cinzel.className} text-2xl font-bold tracking-widest text-[#412712] uppercase drop-shadow-sm md:text-3xl`}
          >
            Codice Celeste
          </h1>
          <p className="mt-0.5 text-sm text-[#613f1c] italic md:text-base">
            Studi di sfumato e tratteggio sui corpi sperici — Leonardo da Vinci, c. 1508
          </p>
        </div>
        <p className={`${nanumPen.className} mt-2 hidden text-xl text-[#523315] opacity-85 rotate-[-1deg] sm:block`}>
          « La spera solare riluce senza termine, et l&apos;ombra si risolve in linee sottilissime »
        </p>
      </header>

      <aside className="davinci-panel absolute right-5 bottom-28 z-10 max-h-[min(28rem,calc(100dvh-10rem))] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-[#9b764b]/40 bg-[#f4e8d1]/80 p-4 text-[#3a2310] shadow-xl shadow-[#422d1b]/20 backdrop-blur-md md:w-80">
        <div className="mb-3 flex items-center justify-between border-b border-[#a88257]/30 pb-2">
          <span className={`${cinzel.className} text-xs font-bold tracking-wider text-[#573516] uppercase`}>
            Parametri del Tratteggio
          </span>
          <span className="rounded-full bg-[#5a3818]/15 px-2 py-0.5 font-mono text-xs font-semibold">
            GLSL NPR
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <HatchSlider
            label="Densità Tratteggio (Density)"
            valueLabel={density.toFixed(1)}
            min={15}
            max={75}
            step={1}
            value={density}
            onChange={setDensity}
          />
          <HatchSlider
            label="Spessore Inchiostro (Weight)"
            valueLabel={weight.toFixed(1)}
            min={0.6}
            max={2.6}
            step={0.1}
            value={weight}
            onChange={setWeight}
          />
          <HatchSlider
            label="Inclinazione Luce (Sun Angle)"
            valueLabel={`${Math.round(lightAngle)}°`}
            min={0}
            max={360}
            step={1}
            value={lightAngle}
            onChange={setLightAngle}
          />

          <div className="flex gap-2 border-t border-[#a88257]/30 pt-2">
            <button
              type="button"
              aria-pressed={showRings}
              onClick={() => setShowRings((value) => !value)}
              className={`flex-1 rounded-md border border-[#9c784e]/60 px-2 py-1.5 text-center font-semibold transition active:scale-95 ${
                showRings ? "bg-[#dcc6a0] hover:bg-[#cfb489]" : "bg-[#f7f1e4] text-[#8a6844] hover:bg-[#efe2cc]"
              }`}
            >
              Compass Rings
            </button>
            <button
              type="button"
              aria-pressed={motion}
              onClick={() => setMotion((value) => !value)}
              className="flex-1 rounded-md border border-[#9c784e]/60 bg-[#dcc6a0] px-2 py-1.5 text-center font-semibold transition hover:bg-[#cfb489] active:scale-95"
            >
              {motion ? "Pause Motion" : "Resume Motion"}
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] leading-tight text-[#714f2e] italic">
          Click and drag with mouse or touch to rotate perspective & investigate the pen marks.
        </p>
      </aside>

      <div className="pointer-events-none absolute bottom-28 left-6 z-10 hidden max-w-xs text-[#53371a] opacity-85 lg:block">
        <div className={`${nanumPen.className} border-l-2 border-[#765431]/40 pl-3 text-2xl leading-none`}>
          Primo grado: linea pura.
          <br />
          Secondo grado: tratteggio incrociato a 45°.
          <br />
          Terzo grado: dense tenebre in bistro d&apos;inchiostro.
        </div>
      </div>
    </div>
  );
}

function HatchSlider({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between font-semibold">
        <span>{label}</span>
        <span className="font-mono">{valueLabel}</span>
      </span>
      <input
        type="range"
        className="davinci-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueLabel}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
