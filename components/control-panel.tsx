"use client";

import {
  Compass,
  LocateFixed,
  MapPin,
  Moon,
  RotateCcw,
  Sparkles,
  SunMedium,
  Sunrise,
  Sunset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { ChromeTone } from "@/lib/light";
import {
  PRESETS,
  coordinateStatus,
  formatAzimuth,
  formatDegrees,
  formatDuration,
  formatLongDate,
  formatMeanTime,
  formatShadow,
  isoFromDate,
  locationLabel,
  seekMinute,
  shadowLengthMeters,
  MOON_ARC_COLOR,
  type AltitudeSample,
  type MoonModel,
  type MoonPlacement,
  type SolarArc,
  type SolarDayTimes,
  type SolarModel,
  type SunPlacement,
} from "@/lib/solar";

interface ControlPanelProps {
  model: SolarModel;
  moonModel: MoonModel;
  moon: MoonPlacement;
  latitude: number;
  longitude: number;
  latText: string;
  lngText: string;
  minutes: number;
  playing: boolean;
  dayIndex: number;
  dayCount: number;
  showSun: boolean;
  showMoon: boolean;
  samples: AltitudeSample[];
  locating: boolean;
  geoError: string | null;
  compactHeader?: boolean;
  tone?: ChromeTone;
  onLatText: (value: string) => void;
  onLngText: (value: string) => void;
  onPreset: (lat: number, lng: number) => void;
  onLocate: () => void;
  onDayIndex: (value: number) => void;
  onDate: (iso: string) => void;
  onMinutes: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onShowSun: (value: boolean) => void;
  onShowMoon: (value: boolean) => void;
  onResetView: () => void;
  onResetPlace: () => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const latState = coordinateStatus(props.latText, -90, 90);
  const lngState = coordinateStatus(props.lngText, -180, 180);

  return (
    <section className="flex flex-col gap-4">
      {!props.compactHeader ? (
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl leading-none tracking-tight text-[#f6f1e7]">
              Solstice
            </p>
            <p className="mt-1 text-sm text-white/55">
              {locationLabel(props.latitude, props.longitude)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={props.onResetView}
            aria-label="Reset camera"
          >
            <RotateCcw />
          </Button>
        </header>
      ) : (
        <header className="mb-1 border-b border-white/8 pb-3">
          <p className="font-display text-xl leading-none tracking-tight text-[#f6f1e7]">Solstice</p>
          <p className="mt-1 truncate text-xs text-white/50">
            {locationLabel(props.latitude, props.longitude)}
          </p>
        </header>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label icon={<MapPin />}>Location</Label>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              onClick={props.onLocate}
              disabled={props.locating}
            >
              <LocateFixed />
              {props.locating ? "Locating…" : "Here"}
            </Button>
            <button
              type="button"
              className="text-xs text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              onClick={props.onResetPlace}
            >
              Orlando
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRESETS.map((preset) => {
            const active =
              Math.abs(preset.lat - props.latitude) < 1e-4 &&
              Math.abs(preset.lng - props.longitude) < 1e-4;
            return (
              <Button
                key={preset.name}
                type="button"
                size="xs"
                variant={active ? "default" : "outline"}
                className={`shrink-0 ${
                  active
                    ? "bg-[#f0b429] text-[#1b1406] hover:bg-[#f0b429]/90"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                onClick={() => props.onPreset(preset.lat, preset.lng)}
              >
                {preset.name}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Latitude"
            value={props.latText}
            invalid={latState === "invalid"}
            onChange={props.onLatText}
          />
          <Field
            label="Longitude"
            value={props.lngText}
            invalid={lngState === "invalid"}
            onChange={props.onLngText}
          />
        </div>
        {latState === "invalid" && (
          <p className="text-xs text-[#ffb4a8]">Latitude must be between −90 and 90.</p>
        )}
        {lngState === "invalid" && (
          <p className="text-xs text-[#ffb4a8]">Longitude must be between −180 and 180.</p>
        )}
        {props.geoError && <p className="text-xs text-[#ffb4a8]">{props.geoError}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <Label>Date</Label>
          <p className="text-right font-mono text-xs text-[#f0b429]">
            {formatLongDate(props.model.date)}
          </p>
        </div>
        <Slider
          min={0}
          max={Math.max(props.dayCount - 1, 0)}
          step={1}
          value={[props.dayIndex]}
          onValueChange={([value]) => props.onDayIndex(value)}
          aria-label="Day of year"
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={isoFromDate(props.model.date)}
            onChange={(event) => props.onDate(event.target.value)}
            className="h-8 border-white/10 bg-white/5 font-mono text-white scheme-dark"
            aria-label="Pick a date"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <Label>Sky bodies</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <BodyToggle
            icon={<SunMedium />}
            label="Sun"
            active={props.showSun}
            onClick={() => props.onShowSun(!props.showSun)}
          />
          <BodyToggle
            icon={<Moon />}
            label="Moon"
            active={props.showMoon}
            onClick={() => props.onShowMoon(!props.showMoon)}
          />
        </div>
      </div>

      {props.showSun && (
        <LightingPhases times={props.model.times} longitude={props.longitude} />
      )}

      <Legend
        arcs={props.model.arcs}
        note={props.model.note}
        showSun={props.showSun}
        showMoon={props.showMoon}
        moonPhase={props.moon.phaseLabel}
      />
    </section>
  );
}

export function StatRail({
  model,
  moonModel,
  sun,
  moon,
  longitude,
  showSun,
  showMoon,
  objectHeight,
  onMinutes,
}: {
  model: SolarModel;
  moonModel: MoonModel;
  sun: SunPlacement;
  moon: MoonPlacement;
  longitude: number;
  showSun: boolean;
  showMoon: boolean;
  objectHeight: number;
  onMinutes: (value: number) => void;
}) {
  const seek = (instant: Date | null) => seekMinute(instant, model.date, longitude);
  const sunriseValue = riseLabel(model, longitude, "sunrise");
  const sunsetValue = riseLabel(model, longitude, "sunset");
  const noonValue = formatMeanTime(model.times.solarNoon, longitude);
  const dawnValue = twilightLabel(model, longitude, "dawn");
  const duskValue = twilightLabel(model, longitude, "dusk");
  const sunriseMinute = seek(model.times.sunrise);
  const sunsetMinute = seek(model.times.sunset);
  const noonMinute = seek(model.times.solarNoon);
  const dawnMinute = seek(model.times.dawn);
  const duskMinute = seek(model.times.dusk);

  return (
    <aside className="pointer-events-auto flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      {showSun && (
        <>
          <Stat
            icon={<Compass />}
            label="Sun azimuth"
            value={formatAzimuth(sun.azimuth)}
            hint="From north, clockwise"
          />
          <Stat
            icon={<SunMedium />}
            label="Sun altitude"
            value={formatDegrees(sun.altitude)}
            hint={sun.aboveHorizon ? "Above the horizon" : "Below the horizon"}
          />
          <Stat
            icon={<SunMedium />}
            label="Shadow"
            value={formatShadow(shadowLengthMeters(sun.altitude, objectHeight))}
            hint={`${objectHeight} m object`}
          />
          <Stat
            icon={<Sparkles />}
            label="Lighting"
            value={sun.lightingPhase.label}
            hint={sun.lightingPhase.hint}
          />
          <Stat
            icon={<Sunrise />}
            label="Dawn"
            value={dawnValue}
            hint="Civil dawn, mean solar time"
            onClick={dawnMinute === null ? undefined : () => onMinutes(dawnMinute)}
            ariaLabel={`Go to dawn, ${dawnValue}`}
          />
          <Stat
            icon={<Sunrise />}
            label="Sunrise"
            value={sunriseValue}
            hint={
              model.times.dayLengthMs
                ? `${formatDuration(model.times.dayLengthMs)} of daylight`
                : "Mean solar time"
            }
            onClick={sunriseMinute === null ? undefined : () => onMinutes(sunriseMinute)}
            ariaLabel={`Go to sunrise, ${sunriseValue}`}
          />
          <Stat
            icon={<SunMedium />}
            label="Solar noon"
            value={noonValue}
            hint="Sun’s highest point"
            onClick={noonMinute === null ? undefined : () => onMinutes(noonMinute)}
            ariaLabel={`Go to solar noon, ${noonValue}`}
          />
          <Stat
            icon={<Sunset />}
            label="Sunset"
            value={sunsetValue}
            hint="Mean solar time"
            onClick={sunsetMinute === null ? undefined : () => onMinutes(sunsetMinute)}
            ariaLabel={`Go to sunset, ${sunsetValue}`}
          />
          <Stat
            icon={<Sunset />}
            label="Dusk"
            value={duskValue}
            hint="Civil dusk, mean solar time"
            onClick={duskMinute === null ? undefined : () => onMinutes(duskMinute)}
            ariaLabel={`Go to dusk, ${duskValue}`}
          />
        </>
      )}
      {showMoon && (
        <>
          <Stat
            icon={<Moon />}
            label="Moon azimuth"
            value={formatAzimuth(moon.azimuth)}
            hint={moon.phaseLabel}
          />
          <Stat
            icon={<Moon />}
            label="Moon altitude"
            value={formatDegrees(moon.altitude)}
            hint={moon.aboveHorizon ? "Above the horizon" : "Below the horizon"}
          />
          <Stat
            icon={<Moon />}
            label="Moonrise"
            value={moonEventLabel(moonModel, longitude, "rise")}
            hint={`${Math.round(moon.fraction * 100)}% illuminated`}
          />
          <Stat
            icon={<Moon />}
            label="Moonset"
            value={moonEventLabel(moonModel, longitude, "set")}
            hint="Mean solar time"
          />
        </>
      )}
    </aside>
  );
}

function twilightLabel(
  model: SolarModel,
  longitude: number,
  which: "dawn" | "dusk",
): string {
  const instant = model.times[which];
  if (!instant) {
    if (model.times.alwaysUp) return "Up all day";
    if (model.times.alwaysDown) return "Down all day";
    return "—";
  }
  return formatMeanTime(instant, longitude);
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

function moonEventLabel(
  model: MoonModel,
  longitude: number,
  which: "rise" | "set",
): string {
  if (model.times.alwaysUp) return which === "rise" ? "Up all day" : "No set";
  if (model.times.alwaysDown) return which === "rise" ? "No rise" : "Down all day";
  return formatMeanTime(model.times[which], longitude);
}

function Stat({
  icon,
  label,
  value,
  hint,
  onClick,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-white/45 uppercase">
        <span className="text-[#f0b429] [&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <p className="mt-1 font-mono text-lg text-[#f7f3ea] tabular-nums">{value}</p>
      <p className="text-[11px] text-white/40">{hint}</p>
    </>
  );
  const shell = "chrome-surface rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5";
  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${shell} w-full text-left hover:bg-white/10`}
    >
      {body}
    </button>
  );
}

function Label({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] text-white/50 uppercase">
      {icon && <span className="text-[#f0b429] [&_svg]:size-3.5">{icon}</span>}
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] tracking-wide text-white/40 uppercase">{label}</span>
      <Input
        inputMode="decimal"
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 border-white/10 bg-black/20 font-mono text-white"
      />
    </label>
  );
}

function BodyToggle({
  icon,
  label,
  active,
  disabled = false,
  fullWidth = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      className={`${fullWidth ? "w-full" : ""} ${
        active
          ? "bg-[#f0b429] text-[#1b1406] hover:bg-[#f0b429]/90"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
    </Button>
  );
}

function LightingPhases({
  times,
  longitude,
}: {
  times: SolarDayTimes;
  longitude: number;
}) {
  if (times.alwaysDown) {
    return (
      <div className="space-y-2 border-t border-white/10 pt-3">
        <Label icon={<Sparkles />}>Lighting phases</Label>
        <p className="text-xs leading-relaxed text-white/50">
          Polar night — twilight boundaries are not defined for this date.
        </p>
      </div>
    );
  }

  if (times.alwaysUp) {
    return (
      <div className="space-y-2 border-t border-white/10 pt-3">
        <Label icon={<Sparkles />}>Lighting phases</Label>
        <p className="text-xs leading-relaxed text-white/50">
          Midnight sun — the sun stays above the horizon all day.
        </p>
      </div>
    );
  }

  const rows: { label: string; morning?: Date | null; evening?: Date | null }[] = [
    {
      label: "Golden hour",
      morning: times.sunrise,
      evening: times.goldenHour,
    },
    {
      label: "Civil twilight",
      morning: times.dawn,
      evening: times.dusk,
    },
    {
      label: "Blue hour",
      morning: times.dawn,
      evening: times.blueHour,
    },
    {
      label: "Nautical twilight",
      morning: times.nauticalDawn,
      evening: times.nauticalDusk,
    },
    {
      label: "Astronomical twilight",
      morning: times.nightEnd,
      evening: times.night,
    },
  ];

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <Label icon={<Sparkles />}>Lighting phases</Label>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 text-xs"
          >
            <span className="text-white/75">{row.label}</span>
            <PhaseTime label="AM" time={row.morning} longitude={longitude} />
            <PhaseTime label="PM" time={row.evening} longitude={longitude} />
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-white/40">
        AM and PM list when each phase begins in mean solar time. Golden hour ends at{" "}
        {formatMeanTime(times.goldenHourEnd, longitude)} and sunset at{" "}
        {formatMeanTime(times.sunset, longitude)}.
      </p>
    </div>
  );
}

function PhaseTime({
  label,
  time,
  longitude,
}: {
  label: string;
  time: Date | null | undefined;
  longitude: number;
}) {
  return (
    <span className="font-mono text-[11px] text-white/45 tabular-nums">
      <span className="text-white/25">{label}</span>{" "}
      {time ? formatMeanTime(time, longitude) : "—"}
    </span>
  );
}

function Legend({
  arcs,
  note,
  showSun,
  showMoon,
  moonPhase,
}: {
  arcs: SolarArc[];
  note: string | null;
  showSun: boolean;
  showMoon: boolean;
  moonPhase: string;
}) {
  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <p className="text-[11px] tracking-[0.16em] text-white/45 uppercase">Sky arcs</p>
      <ul className="space-y-1.5">
        {showSun &&
          arcs.map((arc) => (
            <li key={arc.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-white/80">
                <span
                  className={
                    arc.emphasized
                      ? "h-[3px] w-6 rounded-full"
                      : "h-px w-6 border-t border-dashed"
                  }
                  style={
                    arc.emphasized
                      ? { background: arc.color, boxShadow: `0 0 8px ${arc.color}` }
                      : { borderColor: arc.color, opacity: 0.7 }
                  }
                />
                {arc.label}
              </span>
              <span className="font-mono text-xs text-white/40">{arc.detail}</span>
            </li>
          ))}
        {showMoon && (
          <li className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-white/80">
              <span
                className="h-[3px] w-6 rounded-full"
                style={{
                  background: MOON_ARC_COLOR,
                  boxShadow: `0 0 8px ${MOON_ARC_COLOR}`,
                }}
              />
              Moon path
            </span>
            <span className="font-mono text-xs text-white/40">{moonPhase}</span>
          </li>
        )}
      </ul>
      {note && <p className="text-xs leading-relaxed text-white/50">{note}</p>}
      <p className="text-xs leading-relaxed text-white/40">
        Times use mean solar time for this longitude, so noon stays near the sun’s highest point.
        Civil time is the local clock for this place. Drag the sky to orbit, scroll to zoom, and
        press space to play the day.
      </p>
    </div>
  );
}
