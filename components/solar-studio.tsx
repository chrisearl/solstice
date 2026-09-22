"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ControlPanel, StatRail } from "@/components/control-panel";
import {
  ORLANDO,
  buildSolarModel,
  coordinateStatus,
  dayIndexFromLocalDate,
  dayIndexFromUtcDate,
  daysInYear,
  locationLabel,
  parseIsoDate,
  placeSun,
  seasonalDates,
} from "@/lib/solar";

const SolarScene = dynamic(() => import("@/components/solar-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

function todayCalendar() {
  return dayIndexFromLocalDate(new Date());
}

export function SolarStudio() {
  const [year, setYear] = useState(() => todayCalendar().year);
  const [dayIndex, setDayIndex] = useState(() => todayCalendar().dayIndex);
  const [minutes, setMinutes] = useState(15 * 60);
  const [playing, setPlaying] = useState(false);
  const [latText, setLatText] = useState(String(ORLANDO.lat));
  const [lngText, setLngText] = useState(String(ORLANDO.lng));
  const [latitude, setLatitude] = useState(ORLANDO.lat);
  const [longitude, setLongitude] = useState(ORLANDO.lng);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setMinutes((value) => (value + dt * 48) % 1440);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      event.preventDefault();
      setPlaying((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const model = useMemo(
    () =>
      buildSolarModel({
        year,
        dayIndex,
        latitude,
        longitude,
      }),
    [year, dayIndex, latitude, longitude],
  );

  const sun = useMemo(
    () => placeSun(model.date, minutes, latitude, longitude),
    [model, minutes, latitude, longitude],
  );

  const applyLatitude = (value: string) => {
    setLatText(value);
    if (coordinateStatus(value, -90, 90) === "valid") {
      setLatitude(Number(value.trim()));
    }
  };

  const applyLongitude = (value: string) => {
    setLngText(value);
    if (coordinateStatus(value, -180, 180) === "valid") {
      setLongitude(Number(value.trim()));
    }
  };

  const applyPreset = (lat: number, lng: number) => {
    setLatText(String(lat));
    setLngText(String(lng));
    setLatitude(lat);
    setLongitude(lng);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#07080d] text-[#f3efe6]">
      <div className="absolute inset-0">
        <SolarScene arcs={model.arcs} sun={sun} resetSignal={resetSignal} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-0 lg:flex-row lg:items-start lg:justify-between lg:p-3">
        <div className="pointer-events-auto w-full lg:w-[360px]">
          <ControlPanel
            model={model}
            sun={sun}
            latitude={latitude}
            longitude={longitude}
            latText={latText}
            lngText={lngText}
            minutes={minutes}
            playing={playing}
            dayIndex={dayIndex}
            dayCount={daysInYear(year)}
            onLatText={applyLatitude}
            onLngText={applyLongitude}
            onPreset={applyPreset}
            onDayIndex={setDayIndex}
            onDate={(iso) => {
              const next = parseIsoDate(iso);
              if (!next) return;
              setYear(next.year);
              setDayIndex(next.dayIndex);
            }}
            onMinutes={(value) => {
              setPlaying(false);
              setMinutes(value);
            }}
            onPlaying={setPlaying}
            onJump={(kind) => {
              const seasons = seasonalDates(year, latitude);
              const date = seasons[kind];
              setYear(date.getUTCFullYear());
              setDayIndex(dayIndexFromUtcDate(date));
            }}
            onResetView={() => setResetSignal((value) => value + 1)}
            onResetPlace={() => {
              applyPreset(ORLANDO.lat, ORLANDO.lng);
              const today = dayIndexFromLocalDate(new Date());
              setYear(today.year);
              setDayIndex(today.dayIndex);
              setMinutes(15 * 60);
              setPlaying(false);
            }}
          />
        </div>

        <div className="pointer-events-none absolute top-3 right-3 hidden lg:block">
          <div className="pointer-events-auto">
            <StatRail model={model} sun={sun} longitude={longitude} />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-1.5 text-center backdrop-blur-md lg:block">
        <p className="text-[11px] tracking-[0.18em] text-white/50 uppercase">
          {locationLabel(latitude, longitude)}
        </p>
      </div>

      <p className="sr-only">
        Three-dimensional chart of the sun path for {locationLabel(latitude, longitude)}. Azimuth{" "}
        {sun.azimuth.toFixed(1)} degrees, altitude {sun.altitude.toFixed(1)} degrees.
      </p>
    </div>
  );
}

function ScenePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#07080d]">
      <div className="text-center">
        <div className="mx-auto size-10 animate-pulse rounded-full bg-[#f0b429] shadow-[0_0_32px_rgba(240,180,41,0.8)]" />
        <p className="mt-4 text-sm tracking-[0.18em] text-white/50 uppercase">
          Charting the sky
        </p>
      </div>
    </div>
  );
}
