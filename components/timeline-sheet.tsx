"use client";

import { ChevronUp, Clock, Gauge, Pause, Play } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AltitudeSparkline } from "@/components/altitude-sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCivilTime } from "@/lib/civil-time";
import { phaseLabelColor, type ChromeTone } from "@/lib/light";
import {
  dateFromDayIndex,
  formatMinutes,
  instantAtMinutes,
  minutesToTimeValue,
  timeValueToMinutes,
  type AltitudeSample,
  type SunPlacement,
} from "@/lib/solar";
import { TIMELINE_PEEK_HEIGHT } from "@/lib/layout-insets";
import {
  formatTimelineOffset,
  nextPlaybackSpeed,
  resolveTimeZone,
  TIMELINE_DURATION_MINUTES,
  type PlaybackSpeed,
  type TimelineWindow,
  timelinePhaseTrackStyle,
} from "@/lib/timeline";

export type TimelineSheetState = "peek" | "open";

interface TimelineSheetProps {
  window: TimelineWindow;
  offset: number;
  playing: boolean;
  speed: PlaybackSpeed;
  samples: AltitudeSample[];
  sun: SunPlacement;
  showSun: boolean;
  showMoon: boolean;
  latitude: number;
  longitude: number;
  year: number;
  dayIndex: number;
  minutes: number;
  tone?: ChromeTone;
  onOffset: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onSpeed: (speed: PlaybackSpeed) => void;
}

function subscribeNoop() {
  return () => {};
}

export function TimelineSheet(props: TimelineSheetProps) {
  const [state, setState] = useState<TimelineSheetState>("peek");
  const showNowMarker = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const tone = props.tone ?? "night";
  const timeZone = useMemo(
    () => resolveTimeZone(props.latitude, props.longitude),
    [props.latitude, props.longitude],
  );
  const civilTime = useMemo(() => {
    const date = dateFromDayIndex(props.year, props.dayIndex);
    const instant = instantAtMinutes(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      props.minutes,
      props.longitude,
    );
    return formatCivilTime(instant, timeZone);
  }, [props.year, props.dayIndex, props.minutes, props.longitude, timeZone]);
  const trackStyle = useMemo(
    () =>
      timelinePhaseTrackStyle(
        props.samples,
        props.latitude,
        props.longitude,
        tone,
        props.window.durationMinutes,
      ),
    [props.samples, props.latitude, props.longitude, tone, props.window.durationMinutes],
  );
  const timelineLabel = formatTimelineOffset(props.window.anchorMs, props.offset, timeZone);
  const meanLabel = formatMinutes(props.minutes);

  const rangeLabels = useMemo(() => {
    const start = formatTimelineOffset(props.window.anchorMs, 0, timeZone);
    const mid = formatTimelineOffset(
      props.window.anchorMs,
      props.window.durationMinutes / 2,
      timeZone,
    );
    const end = formatTimelineOffset(
      props.window.anchorMs,
      props.window.durationMinutes,
      timeZone,
    );
    return { start, mid, end };
  }, [props.window.anchorMs, props.window.durationMinutes, timeZone]);

  const maxHeight =
    state === "peek"
      ? `calc(${TIMELINE_PEEK_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
      : "calc(min(34dvh, 15rem) + env(safe-area-inset-bottom, 0px))";

  return (
    <aside
      data-chrome-panel
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,10,16,0.94))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
      style={{
        maxHeight,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
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
          <p className="truncate font-mono text-xs text-[#f0b429] tabular-nums">{timelineLabel}</p>
          <p className="truncate text-[10px] text-white/40">{meanLabel} mean solar</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-10 shrink-0 border-white/10 bg-white/5 text-white hover:bg-white/10"
          aria-pressed={props.playing}
          aria-label={props.playing ? "Pause timeline" : "Play timeline"}
          onClick={() => props.onPlaying(!props.playing)}
        >
          {props.playing ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-10 shrink-0 gap-1 border-white/10 bg-white/5 px-2.5 font-mono text-xs text-white/85 hover:bg-white/10"
          aria-label={`Playback speed ${props.speed.label}, click to cycle`}
          onClick={() => props.onSpeed(nextPlaybackSpeed(props.speed))}
        >
          <Gauge className="size-3.5" />
          {props.speed.label}
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
                  max={props.window.durationMinutes}
                  step={0.5}
                  value={[props.offset]}
                  onValueChange={([value]) => props.onOffset(value)}
                  aria-label="Timeline"
                  hideRange
                  trackStyle={trackStyle}
                />
              )}
              <AltitudeSparkline
                samples={props.samples}
                minutes={props.offset}
                showSun={props.showSun}
                showMoon={props.showMoon}
                tone={tone}
                rangeMinutes={props.window.durationMinutes}
                nowOffset={showNowMarker ? props.window.nowOffset : undefined}
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
                  if (next !== null) {
                    const date = dateFromDayIndex(props.year, props.dayIndex);
                    const instant = instantAtMinutes(
                      date.getUTCFullYear(),
                      date.getUTCMonth(),
                      date.getUTCDate(),
                      next,
                      props.longitude,
                    );
                    const offset = (instant.getTime() - props.window.anchorMs) / 60_000;
                    if (offset >= 0 && offset <= TIMELINE_DURATION_MINUTES) {
                      props.onOffset(offset);
                    }
                  }
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
