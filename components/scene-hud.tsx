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
  Sparkles,
  SunMedium,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDegrees,
  formatLongDate,
  formatMeanTime,
  formatMinutes,
  locationLabel,
  type MoonModel,
  type MoonPlacement,
  type SolarModel,
  type SunPlacement,
} from "@/lib/solar";
import type { Breakpoint } from "@/lib/layout-insets";

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
  onPlaying: (value: boolean) => void;
  onResetView: () => void;
  onToggleInspector: () => void;
}

export function SceneHud(props: SceneHudProps) {
  const location = locationLabel(props.latitude, props.longitude);
  const timeLabel = formatMinutes(props.minutes);
  const dateLabel = formatLongDate(props.model.date);

  if (props.variant === "minimal") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto flex gap-1.5">
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
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] md:px-4 lg:px-5">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <LocationChip label={location} />
            <TimeChip time={timeLabel} date={dateLabel} playing={props.playing} />
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
                  value={formatDegrees(props.sun.azimuth)}
                  compact={props.breakpoint === "mobile"}
                />
                <MetricPill
                  icon={<SunMedium className="size-3.5" />}
                  label="Sun alt"
                  value={formatDegrees(props.sun.altitude)}
                  tone={props.sun.aboveHorizon ? "day" : "night"}
                  compact={props.breakpoint === "mobile"}
                />
                <MetricPill
                  icon={<Sparkles className="size-3.5" />}
                  label="Lighting"
                  value={props.sun.lightingPhase.label}
                  compact={props.breakpoint === "mobile"}
                />
                {(props.breakpoint === "tablet" || props.breakpoint === "desktop" || props.breakpoint === "large") && (
                  <>
                    <MetricPill
                      label="Sunrise"
                      value={riseLabel(props.model, props.longitude, "sunrise")}
                      compact
                    />
                    <MetricPill
                      label="Sunset"
                      value={riseLabel(props.model, props.longitude, "sunset")}
                      compact
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
                  value={formatDegrees(props.moon.azimuth)}
                  compact={props.breakpoint === "mobile"}
                />
                <MetricPill
                  icon={<Moon className="size-3.5" />}
                  label="Moon alt"
                  value={formatDegrees(props.moon.altitude)}
                  tone={props.moon.aboveHorizon ? "day" : "night"}
                  compact={props.breakpoint === "mobile"}
                />
                {(props.breakpoint === "tablet" || props.breakpoint === "desktop" || props.breakpoint === "large") && (
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

        <div className="pointer-events-auto flex shrink-0 flex-col gap-1.5 sm:flex-row lg:flex-col">
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
          <HudAction
            label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
            pressed={props.inspectorOpen}
            onClick={props.onToggleInspector}
            className="lg:hidden"
          >
            <Settings2 />
          </HudAction>
        </div>
      </div>
    </div>
  );
}

function LocationChip({ label }: { label: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
      <MapPin className="size-3.5 shrink-0 text-[#f0b429]" />
      <span className="truncate text-[11px] tracking-[0.14em] text-white/70 uppercase">{label}</span>
    </div>
  );
}

function TimeChip({
  time,
  date,
  playing,
}: {
  time: string;
  date: string;
  playing: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
      <Clock className="size-3.5 shrink-0 text-[#f0b429]" />
      <div className="min-w-0">
        <p className="font-mono text-sm text-[#f7f3ea] tabular-nums">{time}</p>
        <p className="truncate text-[10px] text-white/45">{date}</p>
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

function MetricPill({
  icon,
  label,
  value,
  tone = "neutral",
  compact = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "day" | "night";
  compact?: boolean;
}) {
  const toneClass =
    tone === "day"
      ? "text-[#ffd78a]"
      : tone === "night"
        ? "text-white/55"
        : "text-[#f7f3ea]";

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md"
          : "rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md"
      }
    >
      <div className="flex items-center gap-1 text-[9px] tracking-[0.14em] text-white/45 uppercase">
        {icon && <span className="text-[#f0b429]">{icon}</span>}
        {label}
      </div>
      <p className={`font-mono text-sm tabular-nums ${toneClass}`}>{value}</p>
    </div>
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
      className={`size-11 border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 ${pressed ? "border-[#f0b429]/40 bg-[#f0b429]/15" : ""} ${className}`}
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
