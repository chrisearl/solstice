"use client";

import dynamic from "next/dynamic";
import { PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ControlPanel, StatRail } from "@/components/control-panel";
import { InspectorPanel } from "@/components/inspector-panel";
import { SceneHud } from "@/components/scene-hud";
import {
  isDeviceOrientationSupported,
  requestDeviceOrientationPermission,
  useDeviceOrientation,
} from "@/hooks/use-device-orientation";
import { useInspectorLayout, useLayout } from "@/hooks/use-layout";
import type { ParsedView } from "@/lib/view-query";
import { serializeViewQuery, viewHistoryState } from "@/lib/view-query";
import {
  ORLANDO,
  altitudeSamples,
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
  type SeasonJump,
} from "@/lib/solar";

const SolarScene = dynamic(() => import("@/components/solar-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

function todayCalendar() {
  return dayIndexFromLocalDate(new Date());
}

export function SolarStudio({ initial }: { initial?: ParsedView }) {
  const today = todayCalendar();
  const [year, setYear] = useState(() => initial?.year ?? today.year);
  const [dayIndex, setDayIndex] = useState(() => initial?.dayIndex ?? today.dayIndex);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 15 * 60);
  const [playing, setPlaying] = useState(false);
  const [latText, setLatText] = useState(String(initial?.latitude ?? ORLANDO.lat));
  const [lngText, setLngText] = useState(String(initial?.longitude ?? ORLANDO.lng));
  const [latitude, setLatitude] = useState(initial?.latitude ?? ORLANDO.lat);
  const [longitude, setLongitude] = useState(initial?.longitude ?? ORLANDO.lng);
  const [objectHeight, setObjectHeight] = useState(initial?.objectHeight ?? 1);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [showSun, setShowSun] = useState(true);
  const [showMoon, setShowMoon] = useState(true);
  const [followHeading, setFollowHeading] = useState(false);

  const { state: orientationState, markDenied } = useDeviceOrientation(followHeading);
  const orientationSupported = isDeviceOrientationSupported();
  const deviceHeading =
    orientationState.status === "active" ? orientationState.heading : null;
  const orientationHint =
    orientationState.status === "denied"
      ? "Permission denied"
      : !orientationSupported
        ? "Compass unavailable on this device"
        : undefined;

  const handleFollowHeading = async (value: boolean) => {
    if (!value) {
      setFollowHeading(false);
      return;
    }
    const permission = await requestDeviceOrientationPermission();
    if (permission === "granted") {
      setFollowHeading(true);
      return;
    }
    if (permission === "denied") {
      markDenied();
    }
  };

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
    () => placeSun(model.date, minutes, latitude, longitude, model.times),
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

  const samples = useMemo(
    () => altitudeSamples(model.date, latitude, longitude),
    [model.date, latitude, longitude],
  );

  const roundedMinute = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const viewRef = useRef({
    latitude,
    longitude,
    date: model.date,
    minutes: roundedMinute,
    objectHeight,
  });
  viewRef.current = {
    latitude,
    longitude,
    date: model.date,
    minutes: roundedMinute,
    objectHeight,
  };
  const syncUrlRef = useRef<() => void>(() => {});

  useEffect(() => {
    const minGapMs = 500;
    let lastWrite = 0;
    let pending: number | null = null;

    const write = () => {
      const query = serializeViewQuery(viewRef.current);
      const next = `?${query}`;
      if (window.location.search === next) return;
      const state = viewHistoryState(window.history.state);
      if (!state) return;
      try {
        window.history.replaceState(state, "", next);
      } catch {
        // Safari throws SecurityError after 100 replaceState calls in 30s.
      }
    };

    const sync = () => {
      const wait = minGapMs - (performance.now() - lastWrite);
      if (wait <= 0) {
        if (pending !== null) {
          window.clearTimeout(pending);
          pending = null;
        }
        lastWrite = performance.now();
        write();
        return;
      }
      if (pending !== null) return;
      pending = window.setTimeout(() => {
        pending = null;
        lastWrite = performance.now();
        write();
      }, wait);
    };

    const flush = () => {
      if (pending !== null) {
        window.clearTimeout(pending);
        pending = null;
      }
      lastWrite = performance.now();
      write();
    };

    syncUrlRef.current = sync;
    const interval = window.setInterval(sync, minGapMs);
    sync();
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", flush);
      syncUrlRef.current = () => {};
      flush();
    };
  }, []);

  useEffect(() => {
    if (playing) return;
    syncUrlRef.current();
  }, [playing, latitude, longitude, model.date, roundedMinute, objectHeight]);

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
    setGeoError(null);
  };

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location is unavailable in this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        applyPreset(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission was denied.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("Location request timed out.");
        } else {
          setGeoError("This location is unavailable.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
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
    followHeading,
    orientationSupported,
    orientationHint,
    samples,
    objectHeight,
    locating,
    geoError,
    onLatText: applyLatitude,
    onLngText: applyLongitude,
    onPreset: applyPreset,
    onLocate: locate,
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
    onObjectHeight: (value: number) => {
      if (!Number.isFinite(value)) return;
      setObjectHeight(Math.min(100, Math.max(0.1, value)));
    },
    onPlaying: setPlaying,
    onJump: (kind: SeasonJump) => {
      const seasons = seasonalDates(year, latitude, longitude);
      const date = seasons[kind];
      setYear(date.getUTCFullYear());
      setDayIndex(dayIndexFromUtcDate(date));
    },
    onShowSun: setShowSun,
    onShowMoon: setShowMoon,
    onFollowHeading: handleFollowHeading,
    onResetView: () => {
      setFollowHeading(false);
      setResetSignal((value) => value + 1);
    },
    onResetPlace: () => {
      applyPreset(ORLANDO.lat, ORLANDO.lng);
      const today = dayIndexFromLocalDate(new Date());
      setYear(today.year);
      setDayIndex(today.dayIndex);
      setMinutes(15 * 60);
      setObjectHeight(1);
      setPlaying(false);
      setGeoError(null);
      setShowSun(true);
      setShowMoon(true);
      setFollowHeading(false);
    },
  };

  const showDesktopRail = breakpoint === "desktop" || breakpoint === "large";
  const showPinnedInspector = showDesktopRail && inspectorPinned;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#07080d] text-[#f3efe6]">
      <div className="absolute inset-0">
        <SolarScene
          arcs={model.arcs}
          horizon={model.horizon}
          sun={sun}
          moon={moon}
          moonArc={moonModel.arc}
          showSun={showSun}
          showMoon={showMoon}
          followHeading={followHeading}
          deviceHeading={deviceHeading}
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
        followHeading={followHeading}
        deviceHeading={deviceHeading}
        onMinutes={(value) => {
          setPlaying(false);
          setMinutes(value);
        }}
        onPlaying={setPlaying}
        onResetView={() => {
          setFollowHeading(false);
          setResetSignal((value) => value + 1);
        }}
        onFollowHeading={handleFollowHeading}
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
            objectHeight={objectHeight}
            onMinutes={(value) => {
              setPlaying(false);
              setMinutes(value);
            }}
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
        {sun.azimuth.toFixed(1)} degrees, altitude {sun.altitude.toFixed(1)} degrees, lighting phase{" "}
        {sun.lightingPhase.label}. Moon azimuth {moon.azimuth.toFixed(1)} degrees, altitude{" "}
        {moon.altitude.toFixed(1)} degrees, phase {moon.phaseLabel}.
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
