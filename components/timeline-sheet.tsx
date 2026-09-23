"use client";

import { ChevronUp, Clock, Gauge, Pause, Play } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AltitudeSparkline } from "@/components/altitude-sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCivilTime, resolveTimeZone } from "@/lib/civil-time";
import { formatMinutes, minutesToTimeValue, timeValueToMinutes } from "@/lib/format";
import { phaseLabelColor, phaseTrackStyle, type ChromeTone } from "@/lib/light";
import {
  dateFromDayIndex,
  instantAtMinutes,
  type AltitudeSample,
  type SolarDayTimes,
  type SunPlacement,
} from "@/lib/solar";
import { TIMELINE_PEEK_HEIGHT } from "@/lib/layout-insets";
import {
  clockFromInstant,
  DAY_MINUTES,
  isSameSolarDay,
  nextPlaybackSpeed,
  type PlaybackSpeed,
} from "@/lib/timeline";

export type TimelineSheetState = "peek" | "open";

interface TimelineSheetProps {
  playing: boolean;
  speed: PlaybackSpeed;
  samples: AltitudeSample[];
  times: SolarDayTimes;
  sun: SunPlacement;
  showSun: boolean;
  showMoon: boolean;
  latitude: number;
  longitude: number;
  year: number;
  dayIndex: number;
  minutes: number;
  tone?: ChromeTone;
  onMinutes: (value: number) => void;
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
  const parchment = tone === "parchment";
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
    () => phaseTrackStyle(props.samples, props.times, props.longitude, tone, DAY_MINUTES),
    [props.samples, props.times, props.longitude, tone],
  );
  const meanLabel = formatMinutes(props.minutes);
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
          <p className="truncate font-mono text-xs text-[#f0b429] tabular-nums">{meanLabel}</p>
          <p className="truncate text-[10px] text-white/40">
            {civilTime ? `${civilTime} civil` : "mean solar"}
          </p>
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
