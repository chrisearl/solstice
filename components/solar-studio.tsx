"use client";

import dynamic from "next/dynamic";
import { PanelLeftOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { ControlPanel, StatRail } from "@/components/control-panel";
import { InspectorPanel } from "@/components/inspector-panel";
import { SceneHud } from "@/components/scene-hud";
import { GuardedScene } from "@/components/scene-boundary";
import { SolarMotionProvider } from "@/components/solar-motion";
import { TimelineSheet } from "@/components/timeline-sheet";
import { ViewSwitcher, type StudioView } from "@/components/view-switcher";
import { useDavinciUnlock } from "@/hooks/use-davinci-unlock";
import { useInspectorLayout, useLayout } from "@/hooks/use-layout";
import { useSolarView } from "@/hooks/use-solar-view";
import { STUDIO_CHROME_TOP_CLASS } from "@/lib/layout-insets";
import type { ParsedView } from "@/lib/view-query";
import { locationLabel, parseIsoDate } from "@/lib/format";

const SolarScene = dynamic(() => import("@/components/solar-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

const DavinciView = dynamic(() => import("@/components/davinci-view"), {
  ssr: false,
  loading: () => <DavinciPlaceholder />,
});

export function SolarStudio({ initial }: { initial?: ParsedView }) {
  const viewState = useSolarView(initial);
  const {
    stageRef,
    motion,
    year,
    dayIndex,
    minutes,
    dayCount,
    playing,
    loopDay,
    setDayLoop,
    playbackSpeed,
    setPlaybackSpeed,
    latitude,
    longitude,
    latText,
    lngText,
    locating,
    geoError,
    resetSignal,
    bumpResetSignal,
    showSun,
    showMoon,
    setShowSun,
    setShowMoon,
    fullscreen,
    setFullscreen,
    model,
    sun,
    moonModel,
    moon,
    samples,
    seekMinutes,
    seekDate,
    setPlayback,
    applyLatitude,
    applyLongitude,
    applyPreset,
    locate,
    resetPlace,
  } = viewState;
  const [viewRequest, setView] = useState<StudioView>("default");
  const [davinciMounted, setDavinciMounted] = useState(false);
  const [readingsOpen, setReadingsOpen] = useState(false);
  const { davinciUnlocked } = useDavinciUnlock();
  const view: StudioView = viewRequest === "davinci" && !davinciUnlocked ? "default" : viewRequest;

  const {
    breakpoint,
    inspectorState,
    inspectorPinned,
    inspectorOpen,
    setInspectorState,
    toggleInspector,
    closeInspector,
  } = useInspectorLayout();

  const { insets } = useLayout(inspectorState, inspectorPinned, readingsOpen);
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

  const showStudioChrome = !fullscreen;
  const parchment = view === "davinci";

  const sharedPanelProps = {
    model,
    moonModel,
    moon,
    latitude,
    longitude,
    latText,
    lngText,
    minutes,
    dayIndex,
    dayCount,
    showSun,
    showMoon,
    locating,
    geoError,
    onLatText: applyLatitude,
    onLngText: applyLongitude,
    onPreset: applyPreset,
    onLocate: locate,
    onDayIndex: (value: number) => {
      seekDate(year, value);
    },
    onDate: (iso: string) => {
      const next = parseIsoDate(iso);
      if (!next) return;
      seekDate(next.year, next.dayIndex);
    },
    onMinutes: seekMinutes,
    onShowSun: setShowSun,
    onShowMoon: setShowMoon,
    onResetView: bumpResetSignal,
    onResetPlace: resetPlace,
  };

  const showDesktopRail = breakpoint === "desktop" || breakpoint === "large";
  const showPinnedInspector = showDesktopRail && inspectorPinned;

  return (
    <SolarMotionProvider value={motion}>
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
        <GuardedScene
          title="Charting the sky"
          detail="The graphics view stopped. Try again to start a new one."
          tone="night"
        >
          {(onContextLost) => (
            <SolarScene
              arcs={model.arcs}
              horizon={model.horizon}
              sun={sun}
              moon={moon}
              moonArc={moonModel.arc}
              showSun={showSun}
              showMoon={showMoon}
              resetSignal={resetSignal}
              layoutInsets={sceneInsets}
              active={view === "default"}
              onContextLost={onContextLost}
            />
          )}
        </GuardedScene>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />
      </div>

      {davinciMounted && (
        <div
          className={`absolute inset-0 ${view === "davinci" ? "" : "invisible"}`}
          inert={view === "davinci" ? undefined : true}
          aria-hidden={view !== "davinci"}
        >
          <GuardedScene
            title="Tracing the codex"
            detail="The graphics view stopped. Try again to start a new one."
            tone="parchment"
          >
            {(onContextLost) => (
              <DavinciView
                active={view === "davinci"}
                arcs={model.arcs}
                horizon={model.horizon}
                sun={sun}
                moon={moon}
                moonArc={moonModel.arc}
                showSun={showSun}
                showMoon={showMoon}
                resetSignal={resetSignal}
                layoutInsets={sceneInsets}
                onContextLost={onContextLost}
              />
            )}
          </GuardedScene>
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
          onMinutes={seekMinutes}
          onPlaying={setPlayback}
          onResetView={bumpResetSignal}
          onToggleInspector={toggleInspector}
          readingsOpen={readingsOpen}
          onReadings={setReadingsOpen}
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
            onMinutes={seekMinutes}
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
        playing={playing}
        loopDay={loopDay}
        speed={playbackSpeed}
        samples={samples}
        times={model.times}
        sun={sun}
        showSun={showSun}
        showMoon={showMoon}
        latitude={latitude}
        longitude={longitude}
        year={year}
        dayIndex={dayIndex}
        minutes={minutes}
        tone={parchment ? "parchment" : "night"}
        onMinutes={seekMinutes}
        onPlaying={setPlayback}
        onLoopDay={setDayLoop}
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
    </SolarMotionProvider>
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
