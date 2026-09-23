"use client";

import {
  Clock,
  Compass,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Rows2,
  Settings2,
  SunMedium,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatCivilTime, timezoneAt } from "@/lib/civil-time";
import {
  formatAu,
  formatAzimuth,
  formatDegrees,
  formatEarthSeason,
  formatLongDate,
  formatMeanTime,
  formatMinutes,
  formatOrbitalPhase,
  formatUtcTime,
  locationLabel,
} from "@/lib/format";
import { bodyById, type OrreryModel, type PlanetId } from "@/lib/orrery";
import type { StudioModel } from "@/lib/studio-view";
import { phaseChipStyle, type ChromeTone } from "@/lib/light";
import {
  instantAtMinutes,
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
  studioModel: StudioModel;
  model: SolarModel;
  orreryModel: OrreryModel;
  focusPlanet: PlanetId | "moon";
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
  onMinutes: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onResetView: () => void;
  onToggleInspector: () => void;
  readingsOpen?: boolean;
  onReadings?: (open: boolean) => void;
}

export function SceneHud(props: SceneHudProps) {
  if (props.studioModel === "orrery") {
    return <OrrerySceneHud {...props} />;
  }

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

  if (props.breakpoint === "mobile" && props.variant !== "minimal") {
    return (
      <PortraitFinder
        {...props}
        location={location}
        timeLabel={timeLabel}
        civilTime={civilTime}
        seek={seek}
      />
    );
  }

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
        <HudAction
          label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
          pressed={props.inspectorOpen}
          onClick={props.onToggleInspector}
          className="lg:hidden"
        >
          <Settings2 />
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
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col gap-1.5 sm:flex-row">
          {actionButtons}
        </div>
      </div>
    </div>
  );
}

function PortraitFinder({
  location,
  timeLabel,
  civilTime,
  seek,
  ...props
}: SceneHudProps & {
  location: string;
  timeLabel: string;
  civilTime: string | null;
  seek: (instant: Date | null) => number | null;
}) {
  const readingsOpen = props.readingsOpen ?? false;
  const showReadings = readingsOpen && !props.inspectorOpen;
  const phase = props.showSun ? props.sun.lightingPhase.label : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
      <div className="pointer-events-auto flex items-center gap-1.5">
        <div className="chrome-surface flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
          <Clock className="size-3.5 shrink-0 text-[#f0b429]" />
          <p className="font-mono text-base text-[#f7f3ea] tabular-nums">{timeLabel}</p>
          {phase && (
            <p className="min-w-0 truncate text-[10px] tracking-[0.14em] text-white/55 uppercase">
              {phase}
            </p>
          )}
          {props.playing && (
            <span className="relative ml-auto flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f0b429]/70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[#f0b429]" />
            </span>
          )}
        </div>
        <HudAction
          label={props.playing ? "Pause day" : "Play day"}
          pressed={props.playing}
          onClick={() => props.onPlaying(!props.playing)}
        >
          {props.playing ? <Pause /> : <Play />}
        </HudAction>
        <HudAction
          label={readingsOpen ? "Hide readings" : "Show readings"}
          pressed={showReadings}
          expanded={readingsOpen}
          onClick={() => props.onReadings?.(!readingsOpen)}
        >
          <Rows2 />
        </HudAction>
        <HudAction
          label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
          pressed={props.inspectorOpen}
          onClick={props.onToggleInspector}
        >
          <Settings2 />
        </HudAction>
      </div>

      {showReadings && (
        <div className="chrome-surface pointer-events-auto mt-1.5 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[10px] tracking-[0.16em] text-white/50 uppercase">
              {location}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-[10px] text-white/45">{shortDate(props.model.date)}</p>
              <button
                type="button"
                onClick={props.onResetView}
                className="min-h-11 rounded-lg px-2 text-[10px] tracking-[0.14em] text-white/55 uppercase"
              >
                Reset
              </button>
            </div>
          </div>
          {civilTime && (
            <p className="mt-1 font-mono text-[11px] text-white/60 tabular-nums">Civil {civilTime}</p>
          )}
          <div className="mt-2 space-y-1">
            {props.showSun && (
              <Reading
                label="Sun"
                azimuth={formatAzimuth(props.sun.azimuth)}
                altitude={formatDegrees(props.sun.altitude)}
              />
            )}
            {props.showMoon && (
              <Reading
                label="Moon"
                azimuth={formatAzimuth(props.moon.azimuth)}
                altitude={formatDegrees(props.moon.altitude)}
              />
            )}
          </div>
          {props.showMoon && (
            <p className="mt-1 text-[11px] text-white/55">
              {props.moon.phaseLabel} · {Math.round(props.moon.fraction * 100)}% lit
            </p>
          )}
          {props.showSun && (
            <div className="mt-1 grid grid-cols-3 gap-1">
              <SeekChip
                label="Rise"
                value={riseLabel(props.model, props.longitude, "sunrise")}
                onClick={clickSeek(seek(props.model.times.sunrise), props.onMinutes)}
              />
              <SeekChip
                label="Noon"
                value={formatMeanTime(props.model.times.solarNoon, props.longitude)}
                onClick={clickSeek(seek(props.model.times.solarNoon), props.onMinutes)}
              />
              <SeekChip
                label="Set"
                value={riseLabel(props.model, props.longitude, "sunset")}
                onClick={clickSeek(seek(props.model.times.sunset), props.onMinutes)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Reading({
  label,
  azimuth,
  altitude,
}: {
  label: string;
  azimuth: string;
  altitude: string;
}) {
  return (
    <p className="grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-x-2 font-mono text-[11px] tabular-nums">
      <span className="tracking-[0.14em] text-white/45 uppercase">{label}</span>
      <span className="text-right text-[#f7f3ea]">{azimuth}</span>
      <span className="text-[#f7f3ea]">{altitude}</span>
    </p>
  );
}

function SeekChip({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const className =
    "flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-1 text-left";
  const body = (
    <>
      <span className="text-[9px] tracking-[0.14em] text-white/40 uppercase">{label}</span>
      <span className="truncate font-mono text-[11px] text-[#f7f3ea] tabular-nums">{value}</span>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-label={`Go to ${label.toLowerCase()}, ${value}`} className={className}>
      {body}
    </button>
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
  expanded,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  pressed?: boolean;
  expanded?: boolean;
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
      aria-expanded={expanded}
      onClick={onClick}
      className={`chrome-surface size-11 border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 ${pressed ? "border-[#f0b429]/40 bg-[#f0b429]/15" : ""} ${className}`}
    >
      {children}
    </Button>
  );
}

function OrrerySceneHud(props: SceneHudProps) {
  const focusBody =
    bodyById(props.orreryModel, props.focusPlanet) ?? bodyById(props.orreryModel, "earth");
  const dateLabel = formatLongDate(props.orreryModel.instant);
  const utcTime = formatUtcTime(props.orreryModel.instant);
  const wide = props.breakpoint === "tablet" || props.breakpoint === "desktop" || props.breakpoint === "large";
  const tone = props.tone ?? "night";
  const hudTopClass = "pt-[calc(0.75rem+env(safe-area-inset-top,0px))]";

  const actionButtons = (
    <>
      <HudAction
        label={props.playing ? "Pause" : "Play"}
        pressed={props.playing}
        onClick={() => props.onPlaying(!props.playing)}
      >
        {props.playing ? <Pause /> : <Play />}
      </HudAction>
      <HudAction label="Reset camera" onClick={props.onResetView}>
        <RotateCcw />
      </HudAction>
      {props.variant !== "minimal" && (
        <HudAction
          label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
          pressed={props.inspectorOpen}
          onClick={props.onToggleInspector}
          className="lg:hidden"
        >
          <Settings2 />
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
            <TimeChip time={utcTime} date={dateLabel} civil={null} playing={props.playing} />
            {focusBody && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase backdrop-blur-md"
                style={{ color: focusBody.color }}
              >
                {focusBody.name}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{actionButtons}</div>
        </div>
      </div>
    );
  }

  if (props.breakpoint === "mobile") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="chrome-surface flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
            <Clock className="size-3.5 shrink-0 text-[#f0b429]" />
            <p className="font-mono text-base text-[#f7f3ea] tabular-nums">{utcTime}</p>
            {focusBody && (
              <p className="min-w-0 truncate text-[10px] tracking-[0.14em] text-white/55 uppercase">
                {focusBody.name}
              </p>
            )}
          </div>
          {actionButtons}
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] tracking-[0.12em] text-white/60 uppercase backdrop-blur-md">
              Heliocentric model
            </span>
            <TimeChip time={utcTime} date={dateLabel} civil={null} playing={props.playing} />
          </div>
          {focusBody && (
            <div className="flex flex-wrap gap-1.5">
              <MetricPill label="Focus" value={focusBody.name} />
              <MetricPill
                icon={<Compass className="size-3.5" />}
                label="Longitude"
                value={formatDegrees(focusBody.heliocentricLongitudeDeg)}
              />
              <MetricPill label="Distance" value={formatAu(focusBody.distanceAu)} />
              <MetricPill label="Orbit" value={formatOrbitalPhase(focusBody.orbitalPhase)} />
              {wide && (
                <MetricPill
                  label="Season"
                  value={formatEarthSeason(props.orreryModel.earthSeason)}
                  compact
                />
              )}
              {props.focusPlanet === "moon" && props.showMoon && (
                <MetricPill
                  icon={<Moon className="size-3.5" />}
                  label="Phase"
                  value={`${props.moon.phaseLabel} ${Math.round(props.moon.fraction * 100)}%`}
                  compact
                />
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col gap-1.5 sm:flex-row">
          {actionButtons}
        </div>
      </div>
    </div>
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
