"use client";

import {
  Clock,
  Compass,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SunMedium,
  Sunrise,
  Sunset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  PRESETS,
  coordinateStatus,
  formatDegrees,
  formatDuration,
  formatLongDate,
  formatMeanTime,
  formatMinutes,
  isoFromDate,
  locationLabel,
  minutesToTimeValue,
  timeValueToMinutes,
  MOON_ARC_COLOR,
  type MoonModel,
  type MoonPlacement,
  type SolarArc,
  type SolarModel,
  type SunPlacement,
} from "@/lib/solar";

interface ControlPanelProps {
  model: SolarModel;
  moonModel: MoonModel;
  sun: SunPlacement;
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
  onLatText: (value: string) => void;
  onLngText: (value: string) => void;
  onPreset: (lat: number, lng: number) => void;
  onDayIndex: (value: number) => void;
  onDate: (iso: string) => void;
  onMinutes: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onJump: (kind: "summer" | "equinox" | "winter") => void;
  onShowSun: (value: boolean) => void;
  onShowMoon: (value: boolean) => void;
  onResetView: () => void;
  onResetPlace: () => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const latState = coordinateStatus(props.latText, -90, 90);
  const lngState = coordinateStatus(props.lngText, -180, 180);

  return (
    <section className="panel-scroll flex max-h-[46dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.88),rgba(8,10,16,0.78))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:max-h-[calc(100dvh-1.5rem)] lg:rounded-3xl lg:p-5">
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

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        {props.showSun && (
          <>
            <Stat
              icon={<Compass />}
              label="Sun azimuth"
              value={formatDegrees(props.sun.azimuth)}
              hint={props.sun.aboveHorizon ? "Above horizon" : "Below horizon"}
            />
            <Stat
              icon={<SunMedium />}
              label="Sun altitude"
              value={formatDegrees(props.sun.altitude)}
              hint={props.sun.altitude >= 0 ? "Elevation" : "Depression"}
            />
            <Stat
              icon={<Sunrise />}
              label="Sunrise"
              value={riseLabel(props.model, props.longitude, "sunrise")}
              hint={formatDuration(props.model.times.dayLengthMs)}
            />
            <Stat
              icon={<Sunset />}
              label="Sunset"
              value={riseLabel(props.model, props.longitude, "sunset")}
              hint="Mean solar time"
            />
          </>
        )}
        {props.showMoon && (
          <>
            <Stat
              icon={<Moon />}
              label="Moon azimuth"
              value={formatDegrees(props.moon.azimuth)}
              hint={props.moon.phaseLabel}
            />
            <Stat
              icon={<Moon />}
              label="Moon altitude"
              value={formatDegrees(props.moon.altitude)}
              hint={props.moon.aboveHorizon ? "Above horizon" : "Below horizon"}
            />
            <Stat
              icon={<Moon />}
              label="Moonrise"
              value={moonEventLabel(props.moonModel, props.longitude, "rise")}
              hint={`${Math.round(props.moon.fraction * 100)}% lit`}
            />
            <Stat
              icon={<Moon />}
              label="Moonset"
              value={moonEventLabel(props.moonModel, props.longitude, "set")}
              hint="Mean solar time"
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label icon={<MapPin />}>Location</Label>
          <button
            type="button"
            className="text-xs text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
            onClick={props.onResetPlace}
          >
            Orlando
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
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
                className={
                  active
                    ? "bg-[#f0b429] text-[#1b1406] hover:bg-[#f0b429]/90"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }
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
        <div className="grid grid-cols-3 gap-1.5">
          <Jump label="Summer" onClick={() => props.onJump("summer")} />
          <Jump label="Equinox" onClick={() => props.onJump("equinox")} />
          <Jump label="Winter" onClick={() => props.onJump("winter")} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <Label icon={<Clock />}>Time of day</Label>
          <p className="font-mono text-xs text-[#f0b429]">{formatMinutes(props.minutes)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            className="flex-1"
            min={0}
            max={1439}
            step={0.5}
            value={[props.minutes]}
            onValueChange={([value]) => props.onMinutes(value)}
            aria-label="Time of day"
          />
          <Button
            type="button"
            size="icon"
            className="bg-[#f0b429] text-[#1b1406] hover:bg-[#ffd36a]"
            aria-pressed={props.playing}
            aria-label={props.playing ? "Pause the day" : "Play the day"}
            onClick={() => props.onPlaying(!props.playing)}
          >
            {props.playing ? <Pause /> : <Play />}
          </Button>
        </div>
        <div className="flex justify-between px-0.5 font-mono text-[10px] tracking-wide text-white/35">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
        </div>
        <Input
          type="time"
          value={minutesToTimeValue(props.minutes)}
          onChange={(event) => {
            const next = timeValueToMinutes(event.target.value);
            if (next !== null) props.onMinutes(next);
          }}
          className="h-8 border-white/10 bg-white/5 font-mono text-white scheme-dark"
          aria-label="Clock time"
        />
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
}: {
  model: SolarModel;
  moonModel: MoonModel;
  sun: SunPlacement;
  moon: MoonPlacement;
  longitude: number;
  showSun: boolean;
  showMoon: boolean;
}) {
  return (
    <aside className="hidden w-[220px] flex-col gap-2 lg:flex">
      {showSun && (
        <>
          <Stat
            icon={<Compass />}
            label="Sun azimuth"
            value={formatDegrees(sun.azimuth)}
            hint="From north, clockwise"
          />
          <Stat
            icon={<SunMedium />}
            label="Sun altitude"
            value={formatDegrees(sun.altitude)}
            hint={sun.aboveHorizon ? "Above the horizon" : "Below the horizon"}
          />
          <Stat
            icon={<Sunrise />}
            label="Sunrise"
            value={riseLabel(model, longitude, "sunrise")}
            hint={
              model.times.dayLengthMs
                ? `${formatDuration(model.times.dayLengthMs)} of daylight`
                : "Mean solar time"
            }
          />
          <Stat
            icon={<Sunset />}
            label="Sunset"
            value={riseLabel(model, longitude, "sunset")}
            hint="Mean solar time"
          />
        </>
      )}
      {showMoon && (
        <>
          <Stat
            icon={<Moon />}
            label="Moon azimuth"
            value={formatDegrees(moon.azimuth)}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-white/45 uppercase">
        <span className="text-[#f0b429] [&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <p className="mt-1 font-mono text-lg text-[#f7f3ea] tabular-nums">{value}</p>
      <p className="text-[11px] text-white/40">{hint}</p>
    </div>
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

function Jump({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function BodyToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className={
        active
          ? "bg-[#f0b429] text-[#1b1406] hover:bg-[#f0b429]/90"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
      }
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
    </Button>
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
                  className="h-[3px] w-6 rounded-full"
                  style={{ background: arc.color, boxShadow: `0 0 8px ${arc.color}` }}
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
        Drag the sky to orbit, scroll to zoom, and press space to play the day.
      </p>
    </div>
  );
}
