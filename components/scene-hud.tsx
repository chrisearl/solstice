"use client";

import {
  Clock,
  Compass,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SunMedium,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatCivilTime, timezoneAt } from "@/lib/civil-time";
import { phaseChipStyle, type ChromeTone } from "@/lib/light";
import {
  compassLabel,
  formatAzimuth,
  formatDegrees,
  formatLongDate,
  formatMeanTime,
  formatMinutes,
  instantAtMinutes,
  locationLabel,
  seekMinute,
  type MoonModel,
  type MoonPlacement,
  type SolarModel,
  type SunLightingPhaseInfo,
  type SunPlacement,
} from "@/lib/solar";
import type { Breakpoint, LayoutInsets } from "@/lib/layout-insets";

interface SceneHudProps {
  breakpoint: Breakpoint;
  model: SolarModel;
  moonModel: MoonModel;
  sun: SunPlacement;
  moon: MoonPlacement;
  latitude: number;
  longitude: number;
  minutes: number;
  playing: boolean;
  showSun: boolean;
  showMoon: boolean;
  inspectorOpen: boolean;
  variant?: "full" | "minimal";
  /** Side panels visible — keep HUD in the center column only. */
  desktopChrome?: boolean;
  layoutInsets?: LayoutInsets;
  tone?: ChromeTone;
  followHeading: boolean;
  deviceHeading: number | null;
  onMinutes: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onResetView: () => void;
  onFollowHeading: (value: boolean) => void;
  onToggleInspector: () => void;
}

export function SceneHud(props: SceneHudProps) {
  const location = locationLabel(props.latitude, props.longitude);
  const timeLabel = formatMinutes(props.minutes);
  const dateLabel = formatLongDate(props.model.date);
  const timeZone = useMemo(
    () => timezoneAt(props.latitude, props.longitude),
    [props.latitude, props.longitude],
  );
  const civilTime = useMemo(() => {
    if (!timeZone) return null;
    const instant = instantAtMinutes(
      props.model.date.getUTCFullYear(),
      props.model.date.getUTCMonth(),
      props.model.date.getUTCDate(),
      props.minutes,
      props.longitude,
    );
    return formatCivilTime(instant, timeZone);
  }, [timeZone, props.model.date, props.minutes, props.longitude]);
  const seek = (instant: Date | null) => seekMinute(instant, props.model.date, props.longitude);
  const wide = props.breakpoint === "tablet" || props.breakpoint === "desktop" || props.breakpoint === "large";
  const tone = props.tone ?? "night";

  const hudTopClass = "pt-[calc(0.75rem+env(safe-area-inset-top,0px))]";
  const actionButtons = (
    <>
      <HudAction
        label={props.playing ? "Pause day" : "Play day"}
        pressed={props.playing}
        onClick={() => props.onPlaying(!props.playing)}
      >
        {props.playing ? <Pause /> : <Play />}
      </HudAction>
      <HudAction label="Reset camera" onClick={props.onResetView}>
        <RotateCcw />
      </HudAction>
      {props.variant !== "minimal" && (
        <>
          <HudAction
            label={props.followHeading ? "Stop following heading" : "Follow device heading"}
            pressed={props.followHeading}
            onClick={() => props.onFollowHeading(!props.followHeading)}
            className="lg:hidden"
          >
            <Compass />
          </HudAction>
          <HudAction
            label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
            pressed={props.inspectorOpen}
            onClick={props.onToggleInspector}
            className="lg:hidden"
          >
            <Settings2 />
          </HudAction>
        </>
      )}
      {props.variant === "minimal" && (
        <HudAction
          label={props.followHeading ? "Stop following heading" : "Follow device heading"}
          pressed={props.followHeading}
          onClick={() => props.onFollowHeading(!props.followHeading)}
        >
          <Compass />
        </HudAction>
      )}
    </>
  );

  if (props.variant === "minimal") {
    return (
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 ${hudTopClass}`}>
        <div className="pointer-events-auto flex gap-1.5">{actionButtons}</div>
      </div>
    );
  }

  if (props.desktopChrome && props.layoutInsets) {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center ${hudTopClass}`}
        style={{
          paddingLeft: props.layoutInsets.left,
          paddingRight: props.layoutInsets.right,
        }}
      >
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 px-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TimeChip time={timeLabel} date={dateLabel} civil={civilTime} playing={props.playing} />
            {props.showSun && <PhaseChip phase={props.sun.lightingPhase} tone={tone} />}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{actionButtons}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3 ${hudTopClass} pr-[7.5rem] md:px-4 md:pr-[8.5rem]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <LocationChip label={location} />
            <TimeChip time={timeLabel} date={dateLabel} civil={civilTime} playing={props.playing} />
            {props.showSun && <PhaseChip phase={props.sun.lightingPhase} tone={tone} />}
          </div>

          <div
            className={
              props.breakpoint === "mobile"
                ? "grid grid-cols-2 gap-1.5"
                : "flex flex-wrap gap-1.5"
            }
          >
            {props.showSun && (
              <>
                <MetricPill
                  icon={<Compass className="size-3.5" />}
                  label="Sun az"
                  value={formatAzimuth(props.sun.azimuth)}
                  compact={props.breakpoint === "mobile"}
                />
                <MetricPill
                  icon={<SunMedium className="size-3.5" />}
                  label="Sun alt"
                  value={formatDegrees(props.sun.altitude)}
                  tone={props.sun.aboveHorizon ? "day" : "night"}
                  compact={props.breakpoint === "mobile"}
                />
                {wide && props.breakpoint === "tablet" && (
                  <>
                    <MetricPill
                      label="Sunrise"
                      value={riseLabel(props.model, props.longitude, "sunrise")}
                      compact
                      onClick={clickSeek(seek(props.model.times.sunrise), props.onMinutes)}
                    />
                    <MetricPill
                      label="Solar noon"
                      value={formatMeanTime(props.model.times.solarNoon, props.longitude)}
                      compact
                      onClick={clickSeek(seek(props.model.times.solarNoon), props.onMinutes)}
                    />
                    <MetricPill
                      label="Sunset"
                      value={riseLabel(props.model, props.longitude, "sunset")}
                      compact
                      onClick={clickSeek(seek(props.model.times.sunset), props.onMinutes)}
                    />
                  </>
                )}
              </>
            )}
            {props.showMoon && (
              <>
                <MetricPill
                  icon={<Moon className="size-3.5" />}
                  label="Moon az"
                  value={formatAzimuth(props.moon.azimuth)}
                  compact={props.breakpoint === "mobile"}
                />
                <MetricPill
                  icon={<Moon className="size-3.5" />}
                  label="Moon alt"
                  value={formatDegrees(props.moon.altitude)}
                  tone={props.moon.aboveHorizon ? "day" : "night"}
                  compact={props.breakpoint === "mobile"}
                />
                {props.breakpoint === "tablet" && (
                  <MetricPill
                    label={props.moon.phaseLabel}
                    value={`${Math.round(props.moon.fraction * 100)}% lit`}
                    compact
                  />
                )}
              </>
            )}
            {props.followHeading && props.deviceHeading !== null && (
              <MetricPill
                icon={<Compass className="size-3.5" />}
                label="Heading"
                value={`${formatDegrees(props.deviceHeading, 0)} ${compassLabel(props.deviceHeading)}`}
                compact={props.breakpoint === "mobile"}
              />
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col gap-1.5 sm:flex-row">
          {actionButtons}
        </div>
      </div>
    </div>
  );
}

function LocationChip({ label }: { label: string }) {
  return (
    <div className="chrome-surface inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
      <MapPin className="size-3.5 shrink-0 text-[#f0b429]" />
      <span className="truncate text-[11px] tracking-[0.14em] text-white/70 uppercase">{label}</span>
    </div>
  );
}

function TimeChip({
  time,
  date,
  civil,
  playing,
}: {
  time: string;
  date: string;
  civil: string | null;
  playing: boolean;
}) {
  return (
    <div className="chrome-surface inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
      <Clock className="size-3.5 shrink-0 text-[#f0b429]" />
      <div className="min-w-0">
        <p className="font-mono text-sm text-[#f7f3ea] tabular-nums">{time}</p>
        <p className="truncate text-[10px] text-white/45">{date}</p>
        {civil && <p className="truncate font-mono text-[10px] text-white/60 tabular-nums">{civil}</p>}
      </div>
      {playing && (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f0b429]/70 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-[#f0b429]" />
        </span>
      )}
    </div>
  );
}

function PhaseChip({ phase, tone }: { phase: SunLightingPhaseInfo; tone: ChromeTone }) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 backdrop-blur-md"
      style={phaseChipStyle(phase.id, tone)}
    >
      <span className="text-[11px] tracking-[0.12em] uppercase">{phase.label}</span>
    </div>
  );
}

function clickSeek(minute: number | null, onMinutes: (value: number) => void) {
  if (minute === null) return undefined;
  return () => onMinutes(minute);
}

function MetricPill({
  icon,
  label,
  value,
  tone = "neutral",
  compact = false,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "day" | "night";
  compact?: boolean;
  onClick?: () => void;
}) {
  const toneClass =
    tone === "day"
      ? "text-[#ffd78a]"
      : tone === "night"
        ? "text-white/55"
        : "text-[#f7f3ea]";
  const className = compact
    ? "chrome-surface rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-left backdrop-blur-md"
    : "chrome-surface rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-left backdrop-blur-md";
  const body = (
    <>
      <div className="flex items-center gap-1 text-[9px] tracking-[0.14em] text-white/45 uppercase">
        {icon && <span className="text-[#f0b429]">{icon}</span>}
        {label}
      </div>
      <p className={`font-mono text-sm tabular-nums ${toneClass}`}>{value}</p>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-label={`Go to ${label.toLowerCase()}, ${value}`} className={`${className} hover:bg-white/10`}>
      {body}
    </button>
  );
}

function HudAction({
  children,
  label,
  pressed,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  pressed?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`chrome-surface size-11 border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 ${pressed ? "border-[#f0b429]/40 bg-[#f0b429]/15" : ""} ${className}`}
    >
      {children}
    </Button>
  );
}

function riseLabel(
  model: SolarModel,
  longitude: number,
  which: "sunrise" | "sunset",
): string {
  if (model.times.alwaysUp) return which === "sunrise" ? "Up all day" : "No set";
  if (model.times.alwaysDown) return which === "sunrise" ? "No rise" : "Down all day";
  return formatMeanTime(model.times[which], longitude);
}
