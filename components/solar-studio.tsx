"use client";

import dynamic from "next/dynamic";
import { PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ControlPanel, StatRail } from "@/components/control-panel";
import { InspectorPanel } from "@/components/inspector-panel";
import { SceneHud } from "@/components/scene-hud";
import { useInspectorLayout, useLayout } from "@/hooks/use-layout";
import {
  ORLANDO,
  buildMoonModel,
  buildSolarModel,
  coordinateStatus,
  dayIndexFromLocalDate,
  dayIndexFromUtcDate,
  daysInYear,
  locationLabel,
  parseIsoDate,
  placeMoon,
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
  const [showSun, setShowSun] = useState(true);
  const [showMoon, setShowMoon] = useState(true);

  const {
    breakpoint,
    inspectorState,
    inspectorPinned,
    inspectorOpen,
    setInspectorState,
    toggleInspector,
    closeInspector,
  } = useInspectorLayout();

  const { insets } = useLayout(inspectorState, inspectorPinned);

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

  const moonModel = useMemo(
    () => buildMoonModel(model.date, latitude, longitude),
    [model.date, latitude, longitude],
  );

  const moon = useMemo(
    () => placeMoon(model.date, minutes, latitude, longitude),
    [model.date, minutes, latitude, longitude],
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

  const sharedPanelProps = {
    model,
    moonModel,
    sun,
    moon,
    latitude,
    longitude,
    latText,
    lngText,
    minutes,
    playing,
    dayIndex,
    dayCount: daysInYear(year),
    showSun,
    showMoon,
    onLatText: applyLatitude,
    onLngText: applyLongitude,
    onPreset: applyPreset,
    onDayIndex: setDayIndex,
    onDate: (iso: string) => {
      const next = parseIsoDate(iso);
      if (!next) return;
      setYear(next.year);
      setDayIndex(next.dayIndex);
    },
    onMinutes: (value: number) => {
      setPlaying(false);
      setMinutes(value);
    },
    onPlaying: setPlaying,
    onJump: (kind: "summer" | "equinox" | "winter") => {
      const seasons = seasonalDates(year, latitude);
      const date = seasons[kind];
      setYear(date.getUTCFullYear());
      setDayIndex(dayIndexFromUtcDate(date));
    },
    onShowSun: setShowSun,
    onShowMoon: setShowMoon,
    onResetView: () => setResetSignal((value) => value + 1),
    onResetPlace: () => {
      applyPreset(ORLANDO.lat, ORLANDO.lng);
      const today = dayIndexFromLocalDate(new Date());
      setYear(today.year);
      setDayIndex(today.dayIndex);
      setMinutes(15 * 60);
      setPlaying(false);
      setShowSun(true);
      setShowMoon(true);
    },
  };

  const showDesktopRail = breakpoint === "desktop" || breakpoint === "large";
  const showPinnedInspector = showDesktopRail && inspectorPinned;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#07080d] text-[#f3efe6]">
      <div className="absolute inset-0">
        <SolarScene
          arcs={model.arcs}
          sun={sun}
          moon={moon}
          moonArc={moonModel.arc}
          showSun={showSun}
          showMoon={showMoon}
          resetSignal={resetSignal}
          layoutInsets={insets}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />
      </div>

      <SceneHud
        breakpoint={breakpoint}
        model={model}
        moonModel={moonModel}
        sun={sun}
        moon={moon}
        latitude={latitude}
        longitude={longitude}
        minutes={minutes}
        playing={playing}
        showSun={showSun}
        showMoon={showMoon}
        inspectorOpen={inspectorOpen}
        onPlaying={setPlaying}
        onResetView={() => setResetSignal((value) => value + 1)}
        onToggleInspector={toggleInspector}
      />

      {showPinnedInspector ? (
        <aside className="pointer-events-auto fixed top-3 bottom-3 left-3 z-30 hidden w-[min(360px,calc(100vw-28rem))] flex-col rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.92),rgba(8,10,16,0.86))] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex 2xl:w-[min(400px,calc(100vw-32rem))]">
          <div className="panel-scroll min-h-0 flex-1 overflow-y-auto p-5">
            <ControlPanel {...sharedPanelProps} compactHeader />
          </div>
        </aside>
      ) : (
        <InspectorPanel
          breakpoint={breakpoint}
          state={inspectorState}
          {...sharedPanelProps}
          onClose={closeInspector}
          onPeek={() => setInspectorState("peek")}
          onOpen={() => setInspectorState("open")}
        />
      )}

      {showDesktopRail && (
        <div className="pointer-events-none absolute top-3 right-3 bottom-3 z-20 hidden lg:block">
          <StatRail
            model={model}
            moonModel={moonModel}
            sun={sun}
            moon={moon}
            longitude={longitude}
            showSun={showSun}
            showMoon={showMoon}
          />
        </div>
      )}

      {!showPinnedInspector && (breakpoint === "desktop" || breakpoint === "large") && inspectorState === "closed" && (
        <button
          type="button"
          aria-label="Open inspector"
          onClick={() => setInspectorState("open")}
          className="pointer-events-auto fixed top-1/2 left-3 z-30 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 lg:flex"
        >
          <PanelLeftOpen className="size-5" />
        </button>
      )}

      <p className="sr-only">
        Three-dimensional chart of the sky for {locationLabel(latitude, longitude)}. Sun azimuth{" "}
        {sun.azimuth.toFixed(1)} degrees, altitude {sun.altitude.toFixed(1)} degrees. Moon azimuth{" "}
        {moon.azimuth.toFixed(1)} degrees, altitude {moon.altitude.toFixed(1)} degrees, phase{" "}
        {moon.phaseLabel}.
      </p>
    </div>
  );
}

function ScenePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#07080d]">
      <div className="text-center">
        <div className="mx-auto size-10 animate-pulse rounded-full bg-[#f0b429] shadow-[0_0_32px_rgba(240,180,41,0.8)] motion-reduce:animate-none" />
        <p className="mt-4 text-sm tracking-[0.18em] text-white/50 uppercase">
          Charting the sky
        </p>
      </div>
    </div>
  );
}
