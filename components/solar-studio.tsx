"use client";

import dynamic from "next/dynamic";
import { PanelLeftOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { AssumedControl } from "@/components/assumed-control";
import { ControlPanel } from "@/components/control-panel";
import { InspectorPanel } from "@/components/inspector-panel";
import { SceneHud } from "@/components/scene-hud";
import { GuardedScene } from "@/components/scene-boundary";
import { SolarMotionProvider } from "@/components/solar-motion";
import { StudioSheet } from "@/components/studio-sheet";
import { ViewSwitcher } from "@/components/view-switcher";
import { useInspectorLayout, useLayout } from "@/hooks/use-layout";
import { useDavinciUnlocked } from "@/hooks/use-davinci-unlock";
import { useSolarView } from "@/hooks/use-solar-view";
import { isAssumedControlDay } from "@/lib/assumed-control";
import type { BodyId } from "@/lib/orrery";
import { STUDIO_CHROME_TOP_CLASS } from "@/lib/layout-insets";
import { resolveStudioView } from "@/lib/studio-view";
import { serializeViewQuery, type ParsedView } from "@/lib/view-query";
import { locationLabel, parseIsoDate } from "@/lib/format";

const SolarScene = dynamic(() => import("@/components/solar-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

const DavinciView = dynamic(() => import("@/components/davinci-view"), {
  ssr: false,
  loading: () => <DavinciPlaceholder />,
});

const OrreryScene = dynamic(() => import("@/components/orrery-scene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

const DavinciOrreryView = dynamic(() => import("@/components/davinci-orrery-view"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
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
    loopYear,
    setYearLoop,
    astrolabeSpeed,
    setAstrolabeSpeed,
    orrerySpeed,
    setOrrerySpeed,
    studioModel,
    studioTheme,
    setStudioModel,
    focusPlanet,
    setFocusPlanet,
    visiblePlanets,
    togglePlanetVisibility,
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
    orreryModel,
    sun,
    moonModel,
    moon,
    samples,
    orbitalSamples,
    seekMinutes,
    seekDate,
    setPlayback,
    applyLatitude,
    applyLongitude,
    applyPreset,
    locate,
    resetPlace,
  } = viewState;

  const [davinciMounted, setDavinciMounted] = useState(
    () => initial?.theme === "davinci",
  );
  const [orreryMounted, setOrreryMounted] = useState(
    () => initial?.model === "orrery",
  );
  const davinciUnlocked = useDavinciUnlocked();
  const view = resolveStudioView(studioModel, studioTheme, davinciUnlocked);
  const realtime =
    view.model === "orrery" ? orrerySpeed.realtime : astrolabeSpeed.realtime;

  if (studioTheme === "davinci" && davinciUnlocked && !davinciMounted) {
    setDavinciMounted(true);
  }

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

  const handleModel = (next: typeof studioModel) => {
    if (next === "orrery") setOrreryMounted(true);
    setStudioModel(next);
  };

  const settingsHref = useMemo(
    () =>
      `/settings?${serializeViewQuery({
        latitude,
        longitude,
        date: model.date,
        minutes,
        model: studioModel,
        theme: studioTheme,
      })}`,
    [latitude, longitude, model.date, minutes, studioModel, studioTheme],
  );

  const showStudioChrome = !fullscreen;
  const parchment = view.theme === "davinci";
  const astrolabeActive = view.model === "astrolabe";
  const orreryActive = view.model === "orrery";
  const nightAstrolabe = astrolabeActive && view.theme === "default";
  const davinciAstrolabe = astrolabeActive && view.theme === "davinci";
  const nightOrrery = orreryActive && view.theme === "default";
  const davinciOrrery = orreryActive && view.theme === "davinci";

  const sharedPanelProps = {
    studioModel: view.model,
    model,
    orreryModel,
    focusPlanet,
    visiblePlanets,
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
    onFocusPlanet: setFocusPlanet,
    onTogglePlanet: togglePlanetVisibility,
    onResetView: bumpResetSignal,
    onResetPlace: resetPlace,
  };

  const orrerySceneProps = {
    playing,
    model: orreryModel,
    focusId: focusPlanet,
    visiblePlanets,
    resetSignal,
    layoutInsets: sceneInsets,
    onFocus: (id: BodyId) => {
      if (id !== "sun") setFocusPlanet(id);
    },
  };

  const showDesktopRail = breakpoint === "desktop" || breakpoint === "large";
  const showPinnedInspector = showDesktopRail && inspectorPinned;

  return (
    <SolarMotionProvider value={motion}>
    <div
      ref={stageRef}
      className={`studio-stage relative h-dvh w-full overflow-hidden text-[#f3efe6] ${
        parchment ? "bg-[#dfcdad]" : "bg-[#07080d]"
      }`}
    >
      {parchment && <div className="davinci-parchment-bg" aria-hidden="true" />}
      <div
        className={`absolute inset-0 ${nightAstrolabe ? "" : "invisible"}`}
        inert={nightAstrolabe ? undefined : true}
        aria-hidden={!nightAstrolabe}
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
              orreryModel={orreryModel}
              latitude={latitude}
              resetSignal={resetSignal}
              layoutInsets={sceneInsets}
              active={nightAstrolabe}
              onContextLost={onContextLost}
            />
          )}
        </GuardedScene>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />
      </div>

      {davinciMounted && (
        <div
          className={`absolute inset-0 ${davinciAstrolabe ? "" : "invisible"}`}
          inert={davinciAstrolabe ? undefined : true}
          aria-hidden={!davinciAstrolabe}
        >
          <GuardedScene
            title="Tracing the codex"
            detail="The graphics view stopped. Try again to start a new one."
            tone="parchment"
          >
            {(onContextLost) => (
              <DavinciView
                active={davinciAstrolabe}
                arcs={model.arcs}
                horizon={model.horizon}
                sun={sun}
                moon={moon}
                moonArc={moonModel.arc}
                showSun={showSun}
                showMoon={showMoon}
                orreryModel={orreryModel}
                latitude={latitude}
                resetSignal={resetSignal}
                layoutInsets={sceneInsets}
                onContextLost={onContextLost}
              />
            )}
          </GuardedScene>
        </div>
      )}

      {orreryMounted && (
        <div
          className={`absolute inset-0 ${nightOrrery ? "" : "invisible"}`}
          inert={nightOrrery ? undefined : true}
          aria-hidden={!nightOrrery}
        >
          <GuardedScene
            title="Charting the orrery"
            detail="The graphics view stopped. Try again to start a new one."
            tone="night"
          >
            {(onContextLost) => (
              <OrreryScene
                active={nightOrrery}
                {...orrerySceneProps}
                onContextLost={onContextLost}
              />
            )}
          </GuardedScene>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.42)_100%)]" />
        </div>
      )}

      {orreryMounted && davinciMounted && (
        <div
          className={`absolute inset-0 ${davinciOrrery ? "" : "invisible"}`}
          inert={davinciOrrery ? undefined : true}
          aria-hidden={!davinciOrrery}
        >
          <GuardedScene
            title="Tracing the orrery codex"
            detail="The graphics view stopped. Try again to start a new one."
            tone="parchment"
          >
            {(onContextLost) => (
              <DavinciOrreryView
                active={davinciOrrery}
                {...orrerySceneProps}
                onContextLost={onContextLost}
              />
            )}
          </GuardedScene>
        </div>
      )}

      {isAssumedControlDay(year, dayIndex) && (
        <AssumedControl tone={parchment ? "parchment" : "night"} />
      )}

      <div
        data-chrome={parchment ? "parchment" : undefined}
        className="pointer-events-none absolute inset-0 z-20"
      >
      <SceneHud
          inspectorOpen={inspectorOpen}
          variant={fullscreen ? "minimal" : "full"}
          desktopChrome={showStudioChrome && showDesktopRail}
          layoutInsets={insets}
          tone={parchment ? "parchment" : "night"}
          onResetView={bumpResetSignal}
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

      {showStudioChrome && (
        <ViewSwitcher
          view={view}
          fullscreen={fullscreen}
          settingsHref={settingsHref}
          onModel={handleModel}
          onFullscreen={() => setFullscreen((value) => !value)}
        />
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

      {showStudioChrome && (
        <StudioSheet
          wide={showDesktopRail}
          dockBesidePanel={showPinnedInspector}
          studioModel={view.model}
          playing={playing}
          loopDay={loopDay}
          loopYear={loopYear}
          astrolabeSpeed={astrolabeSpeed}
          orrerySpeed={orrerySpeed}
          samples={samples}
          orbitalSamples={orbitalSamples}
          times={model.times}
          model={model}
          orreryModel={orreryModel}
          focusPlanet={focusPlanet}
          moonModel={moonModel}
          sun={sun}
          moon={moon}
          showSun={showSun}
          showMoon={showMoon}
          latitude={latitude}
          longitude={longitude}
          year={year}
          dayIndex={dayIndex}
          dayCount={dayCount}
          minutes={minutes}
          realtime={realtime}
          tone={parchment ? "parchment" : "night"}
          onMinutes={seekMinutes}
          onDayIndex={(value) => seekDate(year, value)}
          onPlaying={setPlayback}
          onLoopDay={setDayLoop}
          onLoopYear={setYearLoop}
          onAstrolabeSpeed={setAstrolabeSpeed}
          onOrrerySpeed={setOrrerySpeed}
          onResetView={bumpResetSignal}
        />
      )}

      <p className="sr-only">
        {view.model === "orrery" ? (
          <>
            Heliocentric orrery model. Focus {focusPlanet}. Earth season{" "}
            {orreryModel.earthSeason}. Simulation date {model.date.toISOString()}.
          </>
        ) : (
          <>
            Three-dimensional chart of the sky for {locationLabel(latitude, longitude)}. Sun azimuth{" "}
            {sun.azimuth.toFixed(1)} degrees, altitude {sun.altitude.toFixed(1)} degrees, lighting phase{" "}
            {sun.lightingPhase.label}. Moon azimuth {moon.azimuth.toFixed(1)} degrees, altitude{" "}
            {moon.altitude.toFixed(1)} degrees, phase {moon.phaseLabel}.
          </>
        )}
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
    <div className="relative flex h-full w-full items-center justify-center text-[#5c3b1e]">
      <div className="davinci-parchment-bg" aria-hidden="true" />
      <p className="relative z-[1] text-lg italic">Tracing the codex</p>
    </div>
  );
}
