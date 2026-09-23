"use client";

import { ChevronUp, Clock, Gauge, Pause, Play, Repeat } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AltitudeSparkline } from "@/components/altitude-sparkline";
import { OrbitalSparkline } from "@/components/orbital-sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCivilClock, formatCivilTime, resolveTimeZone } from "@/lib/civil-time";
import {
  formatDayOfYear,
  formatMinutes,
  minutesToTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import { phaseLabelColor, phaseTrackStyle, type ChromeTone } from "@/lib/light";
import {
  dateFromDayIndex,
  instantAtMinutes,
  type AltitudeSample,
  type SolarDayTimes,
  type SunPlacement,
} from "@/lib/solar";
import { TIMELINE_PEEK_HEIGHT } from "@/lib/layout-insets";
import type { StudioModel } from "@/lib/studio-view";
import {
  clockFromInstant,
  DAY_MINUTES,
  isSameSolarDay,
  nextOrreryPlaybackSpeed,
  nextPlaybackSpeed,
  type OrreryPlaybackSpeed,
  type PlaybackSpeed,
} from "@/lib/timeline";

export type TimelineSheetState = "peek" | "open";

interface TimelineSheetProps {
  studioModel: StudioModel;
  playing: boolean;
  loopDay: boolean;
  loopYear: boolean;
  astrolabeSpeed: PlaybackSpeed;
  orrerySpeed: OrreryPlaybackSpeed;
  samples: AltitudeSample[];
  orbitalSamples: number[];
  times: SolarDayTimes;
  sun: SunPlacement;
  showSun: boolean;
  showMoon: boolean;
  latitude: number;
  longitude: number;
  year: number;
  dayIndex: number;
  dayCount: number;
  minutes: number;
  tone?: ChromeTone;
  onMinutes: (value: number) => void;
  onDayIndex: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onLoopDay: (value: boolean) => void;
  onLoopYear: (value: boolean) => void;
  onAstrolabeSpeed: (speed: PlaybackSpeed) => void;
  onOrrerySpeed: (speed: OrreryPlaybackSpeed) => void;
}

function subscribeNoop() {
  return () => {};
}

export function TimelineSheet(props: TimelineSheetProps) {
  if (props.studioModel === "orrery") {
    return <OrreryTimelineSheet {...props} />;
  }
  return <AstrolabeTimelineSheet {...props} />;
}

function AstrolabeTimelineSheet(props: TimelineSheetProps) {
  const [state, setState] = useState<TimelineSheetState>("peek");
  const showNowMarker = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const tone = props.tone ?? "night";
  const parchment = tone === "parchment";
  const timeZone = useMemo(
    () => resolveTimeZone(props.latitude, props.longitude),
    [props.latitude, props.longitude],
  );
  const clockInstant = useMemo(() => {
    const date = dateFromDayIndex(props.year, props.dayIndex);
    return instantAtMinutes(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      props.minutes,
      props.longitude,
    );
  }, [props.year, props.dayIndex, props.minutes, props.longitude]);
  const civilClock = useMemo(
    () => formatCivilClock(clockInstant, timeZone),
    [clockInstant, timeZone],
  );
  const civilTime = useMemo(
    () => formatCivilTime(clockInstant, timeZone),
    [clockInstant, timeZone],
  );
  const trackStyle = useMemo(
    () => phaseTrackStyle(props.samples, props.times, props.longitude, tone, DAY_MINUTES),
    [props.samples, props.times, props.longitude, tone],
  );
  const meanLabel = formatMinutes(props.minutes);
  const realtime = props.astrolabeSpeed.realtime;
  const primaryLabel = realtime && civilClock ? civilClock : meanLabel;
  const secondaryLabel = realtime && civilClock ? `${meanLabel} mean solar` : civilTime ? `${civilTime} civil` : "mean solar";
  const nowOffset = useMemo(() => {
    if (!showNowMarker) return undefined;
    const now = clockFromInstant(new Date(), props.longitude);
    if (!isSameSolarDay(now, { year: props.year, dayIndex: props.dayIndex })) return undefined;
    return now.minutes;
  }, [showNowMarker, props.longitude, props.year, props.dayIndex]);
  const rangeLabels = {
    start: formatMinutes(0),
    mid: formatMinutes(DAY_MINUTES / 2),
    end: formatMinutes(0),
  };
  const minutes = Math.min(Math.max(props.minutes, 0), DAY_MINUTES);

  const maxHeight =
    state === "peek"
      ? `calc(${TIMELINE_PEEK_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
      : "calc(min(34dvh, 15rem) + env(safe-area-inset-bottom, 0px))";

  return (
    <aside
      data-chrome={parchment ? "parchment" : undefined}
      data-chrome-panel
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,10,16,0.94))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
      style={{
        maxHeight,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <TimelineHeader
        parchment={parchment}
        state={state}
        setState={setState}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        playing={props.playing}
        loopActive={props.loopDay}
        loopLabel={props.loopDay ? "Day loop on" : "Day loop off"}
        onLoop={() => props.onLoopDay(!props.loopDay)}
        speedLabel={props.astrolabeSpeed.label}
        onSpeed={() => props.onAstrolabeSpeed(nextPlaybackSpeed(props.astrolabeSpeed))}
        onPlaying={() => props.onPlaying(!props.playing)}
      />

      <div className={`px-3 pb-3 md:px-4 ${state === "peek" ? "pb-3" : "pb-4"}`}>
        <div className="space-y-1.5">
          {state === "open" && props.showSun && (
            <p
              className="text-xs"
              style={{ color: phaseLabelColor(props.sun.lightingPhase.id, tone) }}
            >
              {props.sun.lightingPhase.label}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              {state === "open" && (
                <Slider
                  min={0}
                  max={DAY_MINUTES}
                  step={0.5}
                  value={[minutes]}
                  onValueChange={([value]) => props.onMinutes(value)}
                  aria-label="Timeline"
                  hideRange
                  trackStyle={trackStyle}
                />
              )}
              <AltitudeSparkline
                samples={props.samples}
                minutes={minutes}
                showSun={props.showSun}
                showMoon={props.showMoon}
                tone={tone}
                rangeMinutes={DAY_MINUTES}
                nowOffset={nowOffset}
              />
              {state === "open" && (
                <div className="flex justify-between px-0.5 font-mono text-[10px] tracking-wide text-white/35">
                  <span>{rangeLabels.start}</span>
                  <span>{rangeLabels.mid}</span>
                  <span>{rangeLabels.end}</span>
                </div>
              )}
            </div>
          </div>
          {state === "open" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                <Clock className="size-3 text-[#f0b429]" />
                <span className="font-mono text-xs text-white/85 tabular-nums">{meanLabel}</span>
                <span className="text-[10px] text-white/40">mean</span>
              </div>
              {civilTime && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  <span className="font-mono text-xs text-white/85 tabular-nums">{civilTime}</span>
                  <span className="text-[10px] text-white/40">civil</span>
                </div>
              )}
              <Input
                type="time"
                value={minutesToTimeValue(props.minutes)}
                onChange={(event) => {
                  const next = timeValueToMinutes(event.target.value);
                  if (next !== null) props.onMinutes(next);
                }}
                className="h-8 w-[7.5rem] border-white/10 bg-white/5 font-mono text-white scheme-dark"
                aria-label="Clock time"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function OrreryTimelineSheet(props: TimelineSheetProps) {
  const [state, setState] = useState<TimelineSheetState>("peek");
  const tone = props.tone ?? "night";
  const parchment = tone === "parchment";
  const dayLabel = formatDayOfYear(props.dayIndex, props.dayCount, props.year);
  const minutes = Math.min(Math.max(props.minutes, 0), DAY_MINUTES);
  const meanLabel = formatMinutes(props.minutes);

  const maxHeight =
    state === "peek"
      ? `calc(${TIMELINE_PEEK_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
      : "calc(min(34dvh, 15rem) + env(safe-area-inset-bottom, 0px))";

  return (
    <aside
      data-chrome={parchment ? "parchment" : undefined}
      data-chrome-panel
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,10,16,0.94))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
      style={{
        maxHeight,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <TimelineHeader
        parchment={parchment}
        state={state}
        setState={setState}
        primaryLabel={dayLabel}
        secondaryLabel="orbital year"
        playing={props.playing}
        loopActive={props.loopYear}
        loopLabel={props.loopYear ? "Year loop on" : "Year loop off"}
        onLoop={() => props.onLoopYear(!props.loopYear)}
        speedLabel={props.orrerySpeed.label}
        onSpeed={() => props.onOrrerySpeed(nextOrreryPlaybackSpeed(props.orrerySpeed))}
        onPlaying={() => props.onPlaying(!props.playing)}
      />

      <div className={`px-3 pb-3 md:px-4 ${state === "peek" ? "pb-3" : "pb-4"}`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              {state === "open" && (
                <Slider
                  min={0}
                  max={Math.max(0, props.dayCount - 1)}
                  step={1}
                  value={[props.dayIndex]}
                  onValueChange={([value]) => props.onDayIndex(value)}
                  aria-label="Day of year"
                />
              )}
              <OrbitalSparkline
                samples={props.orbitalSamples}
                dayIndex={props.dayIndex}
                dayCount={props.dayCount}
                tone={tone}
              />
              {state === "open" && (
                <div className="flex justify-between px-0.5 font-mono text-[10px] tracking-wide text-white/35">
                  <span>Jan 1</span>
                  <span>Jul 1</span>
                  <span>Dec 31</span>
                </div>
              )}
            </div>
          </div>
          {state === "open" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                <Clock className="size-3 text-[#f0b429]" />
                <span className="font-mono text-xs text-white/85 tabular-nums">{meanLabel}</span>
                <span className="text-[10px] text-white/40">time (Moon)</span>
              </div>
              <Slider
                min={0}
                max={DAY_MINUTES}
                step={0.5}
                value={[minutes]}
                onValueChange={([value]) => props.onMinutes(value)}
                aria-label="Time of day"
                className="min-w-[8rem] flex-1"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function TimelineHeader({
  parchment,
  state,
  setState,
  primaryLabel,
  secondaryLabel,
  playing,
  loopActive,
  loopLabel,
  onLoop,
  speedLabel,
  onSpeed,
  onPlaying,
}: {
  parchment: boolean;
  state: TimelineSheetState;
  setState: (state: TimelineSheetState) => void;
  primaryLabel: string;
  secondaryLabel: string;
  playing: boolean;
  loopActive: boolean;
  loopLabel: string;
  onLoop: () => void;
  speedLabel: string;
  onSpeed: () => void;
  onPlaying: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 md:px-4">
      <button
        type="button"
        className="flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl"
        onClick={() => setState(state === "peek" ? "open" : "peek")}
        aria-expanded={state === "open"}
        aria-label={state === "open" ? "Collapse timeline" : "Expand timeline"}
      >
        <span className="h-1 w-10 rounded-full bg-white/25" />
        <span className="text-[10px] tracking-[0.16em] text-white/45 uppercase">Timeline</span>
      </button>
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate font-mono text-xs text-[#f0b429] tabular-nums">{primaryLabel}</p>
        <p className="truncate text-[10px] text-white/40">{secondaryLabel}</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 shrink-0 border-white/10 bg-white/5 text-white hover:bg-white/10"
        aria-pressed={playing}
        aria-label={playing ? "Pause timeline" : "Play timeline"}
        onClick={onPlaying}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`size-10 shrink-0 border-white/10 bg-white/5 text-white hover:bg-white/10 ${loopActive ? "border-[#f0b429]/40 bg-[#f0b429]/15 text-[#f0b429]" : ""}`}
        aria-pressed={loopActive}
        aria-label={loopLabel}
        onClick={onLoop}
      >
        <Repeat className={loopActive ? "size-4" : "size-4 opacity-70"} />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-10 shrink-0 gap-1 border-white/10 bg-white/5 px-2.5 font-mono text-xs text-white/85 hover:bg-white/10"
        aria-label={`Playback speed ${speedLabel}, click to cycle`}
        onClick={onSpeed}
      >
        <Gauge className="size-3.5" />
        {speedLabel}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 shrink-0 border-white/10 bg-white/5 text-white hover:bg-white/10 lg:hidden"
        aria-label={state === "open" ? "Collapse timeline" : "Expand timeline"}
        onClick={() => setState(state === "peek" ? "open" : "peek")}
      >
        <ChevronUp className={`transition-transform ${state === "open" ? "rotate-180" : ""}`} />
      </Button>
    </div>
  );
}
