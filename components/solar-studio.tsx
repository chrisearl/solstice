"use client";

import dynamic from "next/dynamic";
import { PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ControlPanel, StatRail } from "@/components/control-panel";
import { InspectorPanel } from "@/components/inspector-panel";
import { SceneHud } from "@/components/scene-hud";
import { TimelineSheet } from "@/components/timeline-sheet";
import { ViewSwitcher, type StudioView } from "@/components/view-switcher";
import { useDavinciUnlock } from "@/hooks/use-davinci-unlock";
import {
  requestDeviceOrientationPermission,
  useDeviceOrientation,
  useIsDeviceOrientationSupported,
} from "@/hooks/use-device-orientation";
import { useInspectorLayout, useLayout } from "@/hooks/use-layout";
import { STUDIO_CHROME_TOP_CLASS } from "@/lib/layout-insets";
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
import {
  buildTimelineWindow,
  offsetToSolarState,
  PLAYBACK_SPEEDS,
  solarStateToOffset,
  TIMELINE_DURATION_MINUTES,
  timelineSamples,
  type PlaybackSpeed,
  type TimelineWindow,
} from "@/lib/timeline";

const SolarScene = dynamic(() => import("@/components/solar-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

const DavinciView = dynamic(() => import("@/components/davinci-view"), {
  ssr: false,
  loading: () => <DavinciPlaceholder />,
});

function todayCalendar() {
  return dayIndexFromLocalDate(new Date());
}

function currentMinutesOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function initialTimelineState(initial: ParsedView | undefined, latitude: number, longitude: number) {
  const window = buildTimelineWindow(new Date(), latitude, longitude);
  const today = todayCalendar();
  if (initial?.minutes !== undefined) {
    const year = initial.year ?? today.year;
    const dayIndex = initial.dayIndex ?? today.dayIndex;
    const offset = solarStateToOffset(
      window.anchorMs,
      year,
      dayIndex,
      initial.minutes,
      longitude,
    );
    if (offset >= 0 && offset <= TIMELINE_DURATION_MINUTES) {
      return {
        window,
        offset,
        year,
        dayIndex,
        minutes: initial.minutes,
        today,
      };
    }
  }
  const nowState = offsetToSolarState(window.anchorMs, window.nowOffset, longitude);
  return {
    window,
    offset: window.nowOffset,
    year: nowState.year,
    dayIndex: nowState.dayIndex,
    minutes: nowState.minutes,
    today,
  };
}

export function SolarStudio({ initial }: { initial?: ParsedView }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bootLatitude = initial?.latitude ?? ORLANDO.lat;
  const bootLongitude = initial?.longitude ?? ORLANDO.lng;
  const [bootTimeline] = useState(() =>
    initialTimelineState(initial, bootLatitude, bootLongitude),
  );
  const today = bootTimeline.today ?? todayCalendar();
  const timelineWindow = bootTimeline.window;
  const [timelineOffset, setTimelineOffset] = useState(() => bootTimeline.offset);
  const [year, setYear] = useState(() => initial?.year ?? bootTimeline.year ?? today.year);
  const [dayIndex, setDayIndex] = useState(
    () => initial?.dayIndex ?? bootTimeline.dayIndex ?? today.dayIndex,
  );
  const [minutes, setMinutes] = useState(
    () => initial?.minutes ?? bootTimeline.minutes ?? currentMinutesOfDay(),
  );
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(PLAYBACK_SPEEDS[2]);
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
  const [view, setView] = useState<StudioView>("default");
  const [fullscreen, setFullscreen] = useState(false);
  const [davinciMounted, setDavinciMounted] = useState(false);
  const [followHeading, setFollowHeading] = useState(false);
  const { davinciUnlocked } = useDavinciUnlock();

  const { state: orientationState, markDenied } = useDeviceOrientation(followHeading);
  const orientationSupported = useIsDeviceOrientationSupported();
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
  const sceneInsets = useMemo(
    () =>
      fullscreen
        ? { left: 32, right: 32, top: 72, bottom: 100 }
        : {
            left: insets.left,
            right: insets.right,
            top: insets.top,
            bottom: insets.bottom,
          },
    [fullscreen, insets.bottom, insets.left, insets.right, insets.top],
  );

  const selectView = (next: StudioView) => {
    if (next === "davinci" && !davinciUnlocked) return;
    if (next === "davinci") setDavinciMounted(true);
    setView(next);
  };

  useEffect(() => {
    if (!davinciUnlocked && view === "davinci") {
      setView("default");
    }
  }, [davinciUnlocked, view]);

  const showStudioChrome = !fullscreen;
  const parchment = view === "davinci";

  const applyTimelineOffset = (offset: number, stopPlayback = true) => {
    const clamped = Math.min(Math.max(offset, 0), TIMELINE_DURATION_MINUTES);
    if (stopPlayback) setPlaying(false);
    setTimelineOffset(clamped);
    const next = offsetToSolarState(timelineWindow.anchorMs, clamped, longitude);
    setYear(next.year);
    setDayIndex(next.dayIndex);
    setMinutes(next.minutes);
  };

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setTimelineOffset((value) => {
        const next = value + dt * playbackSpeed.minutesPerSecond;
        const wrapped =
          next > TIMELINE_DURATION_MINUTES ? next - TIMELINE_DURATION_MINUTES : next;
        const solar = offsetToSolarState(timelineWindow.anchorMs, wrapped, longitude);
        setYear(solar.year);
        setDayIndex(solar.dayIndex);
        setMinutes(solar.minutes);
        return wrapped;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, playbackSpeed.minutesPerSecond, timelineWindow.anchorMs, longitude]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      event.preventDefault();
      setPlaying((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    if (!fullscreen) {
      if (document.fullscreenElement === node) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    if (document.fullscreenElement === node) return;
    node.requestFullscreen?.().catch(() => {});
  }, [fullscreen]);

  useEffect(() => {
    const onChange = () => {
      const node = stageRef.current;
      if (!node) return;
      if (document.fullscreenElement !== node) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

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

  const timelineChartSamples = useMemo(
    () =>
      timelineSamples(
        timelineWindow.anchorMs,
        timelineWindow.durationMinutes,
        latitude,
        longitude,
      ),
    [timelineWindow.anchorMs, timelineWindow.durationMinutes, latitude, longitude],
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
    onDayIndex: (value: number) => {
      setPlaying(false);
      setDayIndex(value);
      setTimelineOffset(
        solarStateToOffset(timelineWindow.anchorMs, year, value, minutes, longitude),
      );
    },
    onDate: (iso: string) => {
      const next = parseIsoDate(iso);
      if (!next) return;
      setPlaying(false);
      setYear(next.year);
      setDayIndex(next.dayIndex);
      setTimelineOffset(
        solarStateToOffset(
          timelineWindow.anchorMs,
          next.year,
          next.dayIndex,
          minutes,
          longitude,
        ),
      );
    },
    onMinutes: (value: number) => {
      applyTimelineOffset(
        solarStateToOffset(timelineWindow.anchorMs, year, dayIndex, value, longitude),
      );
    },
    onObjectHeight: (value: number) => {
      if (!Number.isFinite(value)) return;
      setObjectHeight(Math.min(100, Math.max(0.1, value)));
    },
    onPlaying: setPlaying,
    onJump: (kind: SeasonJump) => {
      const seasons = seasonalDates(year, latitude, longitude);
      const date = seasons[kind];
      const nextYear = date.getUTCFullYear();
      const nextDayIndex = dayIndexFromUtcDate(date);
      setPlaying(false);
      setYear(nextYear);
      setDayIndex(nextDayIndex);
      setTimelineOffset(
        solarStateToOffset(timelineWindow.anchorMs, nextYear, nextDayIndex, minutes, longitude),
      );
    },
    onShowSun: setShowSun,
    onShowMoon: setShowMoon,
    onFollowHeading: handleFollowHeading,
    onResetView: () => {
      setFollowHeading(false);
      setResetSignal((value) => value + 1);
    },
    tone: parchment ? ("parchment" as const) : ("night" as const),
    onResetPlace: () => {
      applyPreset(ORLANDO.lat, ORLANDO.lng);
      const resetWindow = buildTimelineWindow(new Date(), ORLANDO.lat, ORLANDO.lng);
      const nowState = offsetToSolarState(resetWindow.anchorMs, resetWindow.nowOffset, ORLANDO.lng);
      setYear(nowState.year);
      setDayIndex(nowState.dayIndex);
      setMinutes(nowState.minutes);
      setTimelineOffset(resetWindow.nowOffset);
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
    <div
      ref={stageRef}
      className={`studio-stage relative h-dvh w-full overflow-hidden text-[#f3efe6] ${
        view === "davinci" ? "bg-[#dfcdad]" : "bg-[#07080d]"
      }`}
    >
      <div
        className={`absolute inset-0 ${view === "default" ? "" : "invisible"}`}
        inert={view === "default" ? undefined : true}
        aria-hidden={view !== "default"}
      >
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
          layoutInsets={sceneInsets}
          active={view === "default"}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />
      </div>

      {davinciMounted && (
        <div
          className={`absolute inset-0 ${view === "davinci" ? "" : "invisible"}`}
          inert={view === "davinci" ? undefined : true}
          aria-hidden={view !== "davinci"}
        >
          <DavinciView
            active={view === "davinci"}
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
            layoutInsets={sceneInsets}
          />
        </div>
      )}

      <div
        data-chrome={parchment ? "parchment" : undefined}
        className="pointer-events-none absolute inset-0 z-20"
      >
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
          variant={fullscreen ? "minimal" : "full"}
          desktopChrome={showStudioChrome && showDesktopRail}
          layoutInsets={insets}
          tone={parchment ? "parchment" : "night"}
          followHeading={followHeading}
          deviceHeading={deviceHeading}
          onMinutes={(value) => {
            applyTimelineOffset(
              solarStateToOffset(timelineWindow.anchorMs, year, dayIndex, value, longitude),
            );
          }}
          onPlaying={setPlaying}
          onResetView={() => {
            setFollowHeading(false);
            setResetSignal((value) => value + 1);
          }}
          onFollowHeading={handleFollowHeading}
          onToggleInspector={toggleInspector}
        />

      {showStudioChrome && showPinnedInspector && (
        <aside
          data-chrome-panel
          className={`pointer-events-auto fixed ${STUDIO_CHROME_TOP_CLASS} bottom-3 left-3 z-30 hidden w-[min(340px,calc(100vw-30rem))] flex-col rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.92),rgba(8,10,16,0.86))] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex 2xl:w-[min(380px,calc(100vw-34rem))]`}
        >
          <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
            <ControlPanel {...sharedPanelProps} compactHeader />
          </div>
        </aside>
      )}

      {showStudioChrome && !showPinnedInspector && (
        <InspectorPanel
          breakpoint={breakpoint}
          state={inspectorState}
          {...sharedPanelProps}
          onClose={closeInspector}
          onPeek={() => setInspectorState("peek")}
          onOpen={() => setInspectorState("open")}
        />
      )}

      {showStudioChrome && showDesktopRail && (
        <div
          className={`pointer-events-none absolute ${STUDIO_CHROME_TOP_CLASS} right-3 bottom-3 z-30 hidden w-[min(220px,calc(100vw-30rem))] flex-col gap-2 lg:flex 2xl:w-[240px]`}
        >
          <ViewSwitcher
            inline
            view={view}
            fullscreen={fullscreen}
            davinciUnlocked={davinciUnlocked}
            onView={selectView}
            onFullscreen={() => setFullscreen((value) => !value)}
            className="pointer-events-auto shrink-0"
          />
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
              applyTimelineOffset(
                solarStateToOffset(timelineWindow.anchorMs, year, dayIndex, value, longitude),
              );
            }}
          />
        </div>
      )}

      {showStudioChrome &&
        !showPinnedInspector &&
        (breakpoint === "desktop" || breakpoint === "large") &&
        inspectorState === "closed" && (
          <button
            type="button"
            aria-label="Open inspector"
            onClick={() => setInspectorState("open")}
            className="pointer-events-auto fixed top-1/2 left-3 z-30 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 lg:flex"
          >
            <PanelLeftOpen className="size-5" />
          </button>
        )}
      </div>

      <TimelineSheet
        window={timelineWindow}
        offset={timelineOffset}
        playing={playing}
        speed={playbackSpeed}
        samples={timelineChartSamples}
        sun={sun}
        showSun={showSun}
        showMoon={showMoon}
        latitude={latitude}
        longitude={longitude}
        year={year}
        dayIndex={dayIndex}
        minutes={minutes}
        tone={parchment ? "parchment" : "night"}
        onOffset={applyTimelineOffset}
        onPlaying={setPlaying}
        onSpeed={setPlaybackSpeed}
      />

      {(!showStudioChrome || !showDesktopRail) && (
        <ViewSwitcher
          view={view}
          fullscreen={fullscreen}
          davinciUnlocked={davinciUnlocked}
          onView={selectView}
          onFullscreen={() => setFullscreen((value) => !value)}
        />
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

function DavinciPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#dfcdad] text-[#5c3b1e]">
      <p className="text-lg italic">Tracing the codex</p>
    </div>
  );
}
