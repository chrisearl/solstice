"use client";

import {
  ChevronUp,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Moon,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SunMedium,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AltitudeSparkline } from "@/components/altitude-sparkline";
import { OrbitalSparkline } from "@/components/orbital-sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCivilClock, formatCivilTime, resolveTimeZone } from "@/lib/civil-time";
import { formatUtcTime } from "@/lib/format";
import {
  formatAu,
  formatAzimuth,
  formatDayOfYear,
  formatDegrees,
  formatEarthSeason,
  formatLongDate,
  formatMeanTime,
  formatMinutes,
  formatOrbitalPhase,
  locationLabel,
  minutesToTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import { bodyById, type OrreryModel, type PlanetId } from "@/lib/orrery";
import { phaseChipStyle, phaseLabelColor, phaseTrackStyle, type ChromeTone } from "@/lib/light";
import {
  STUDIO_SHEET_CLOSED_HEIGHT,
  STUDIO_SHEET_EXPANDED_MAX,
} from "@/lib/layout-insets";
import type { StudioModel } from "@/lib/studio-view";
import {
  dateFromDayIndex,
  instantAtMinutes,
  seekMinute,
  type AltitudeSample,
  type MoonModel,
  type MoonPlacement,
  type SolarDayTimes,
  type SolarModel,
  type SunPlacement,
} from "@/lib/solar";
import {
  clockFromInstant,
  DAY_MINUTES,
  isSameSolarDay,
  nextOrreryPlaybackSpeed,
  nextPlaybackSpeed,
  type OrreryPlaybackSpeed,
  type PlaybackSpeed,
} from "@/lib/timeline";

export type StudioSheetState = "closed" | "expanded";

interface StudioSheetProps {
  studioModel: StudioModel;
  playing: boolean;
  loopDay: boolean;
  loopYear: boolean;
  astrolabeSpeed: PlaybackSpeed;
  orrerySpeed: OrreryPlaybackSpeed;
  samples: AltitudeSample[];
  orbitalSamples: number[];
  times: SolarDayTimes;
  model: SolarModel;
  orreryModel: OrreryModel;
  focusPlanet: PlanetId | "moon";
  moonModel: MoonModel;
  sun: SunPlacement;
  moon: MoonPlacement;
  showSun: boolean;
  showMoon: boolean;
  latitude: number;
  longitude: number;
  year: number;
  dayIndex: number;
  dayCount: number;
  minutes: number;
  realtime?: boolean;
  tone?: ChromeTone;
  onMinutes: (value: number) => void;
  onDayIndex: (value: number) => void;
  onPlaying: (value: boolean) => void;
  onLoopDay: (value: boolean) => void;
  onLoopYear: (value: boolean) => void;
  onAstrolabeSpeed: (speed: PlaybackSpeed) => void;
  onOrrerySpeed: (speed: OrreryPlaybackSpeed) => void;
  onResetView: () => void;
}

function subscribeNoop() {
  return () => {};
}

export function StudioSheet(props: StudioSheetProps) {
  const [state, setState] = useState<StudioSheetState>("closed");
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tone = props.tone ?? "night";
  const parchment = tone === "parchment";

  const pageCount = 2;
  const expanded = state === "expanded";

  const scrollToPage = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, pageCount - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setPage(clamped);
  }, [pageCount]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const maxHeight = expanded
    ? `calc(min(${STUDIO_SHEET_EXPANDED_MAX}px, 38dvh) + env(safe-area-inset-bottom, 0px))`
    : `calc(${STUDIO_SHEET_CLOSED_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;

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
      <StatusBar
        {...props}
        tone={tone}
        expanded={expanded}
        onToggle={() => setState(expanded ? "closed" : "expanded")}
      />

      {expanded && (
        <>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="w-full shrink-0 snap-start px-3 pb-2 md:px-4">
              {props.studioModel === "orrery" ? (
                <OrreryTimelinePage {...props} tone={tone} />
              ) : (
                <AstrolabeTimelinePage {...props} tone={tone} />
              )}
            </div>
            <div className="w-full shrink-0 snap-start px-3 pb-2 md:px-4">
              {props.studioModel === "orrery" ? (
                <OrreryReadingsPage {...props} tone={tone} />
              ) : (
                <AstrolabeReadingsPage {...props} tone={tone} onResetView={props.onResetView} />
              )}
            </div>
          </div>

          <PageDots count={pageCount} current={page} onSelect={scrollToPage} />
        </>
      )}
    </aside>
  );
}

function StatusBar(
  props: StudioSheetProps & {
    tone: ChromeTone;
    expanded: boolean;
    onToggle: () => void;
  },
) {
  const isOrrery = props.studioModel === "orrery";
  const meanLabel = formatMinutes(props.minutes);
  const dayLabel = formatDayOfYear(props.dayIndex, props.dayCount, props.year);
  const utcTime = formatUtcTime(props.orreryModel.instant);

  const { timeLabel, secondary } = useMemo(() => {
    const tz = resolveTimeZone(props.latitude, props.longitude);
    if (isOrrery) {
      const civilClock = tz ? formatCivilClock(props.orreryModel.instant, tz) : null;
      return {
        timeLabel: props.realtime && civilClock ? civilClock : dayLabel,
        secondary: props.realtime && civilClock ? `${utcTime} UTC` : meanLabel,
      };
    }
    const date = dateFromDayIndex(props.year, props.dayIndex);
    const instant = instantAtMinutes(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      props.minutes,
      props.longitude,
    );
    const civilClock = tz ? formatCivilClock(instant, tz) : null;
    const civilTime = tz ? formatCivilTime(instant, tz) : null;
    return {
      timeLabel: props.realtime && civilClock ? civilClock : meanLabel,
      secondary:
        props.realtime && civilClock
          ? `${meanLabel} mean solar`
          : civilTime ?? formatLongDate(props.model.date),
    };
  }, [
    isOrrery,
    props.realtime,
    props.latitude,
    props.longitude,
    props.year,
    props.dayIndex,
    props.minutes,
    props.orreryModel.instant,
    dayLabel,
    meanLabel,
    utcTime,
    props.model.date,
  ]);

  const badge = isOrrery
    ? bodyById(props.orreryModel, props.focusPlanet)?.name
    : props.showSun
      ? props.sun.lightingPhase.label
      : props.showMoon
        ? props.moon.phaseLabel
        : null;

  const badgeStyle =
    !isOrrery && props.showSun
      ? phaseChipStyle(props.sun.lightingPhase.id, props.tone)
      : undefined;

  return (
    <div className="flex items-center gap-2 px-3 py-2 md:px-4">
      <button
        type="button"
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-2xl text-left"
        onClick={props.onToggle}
        aria-expanded={props.expanded}
        aria-label={props.expanded ? "Collapse studio panel" : "Expand studio panel"}
      >
        <span className="hidden h-1 w-8 shrink-0 rounded-full bg-white/25 sm:block" />
        <Clock className="size-3.5 shrink-0 text-[#f0b429]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-[#f7f3ea] tabular-nums">{timeLabel}</p>
          <p className="truncate text-[10px] text-white/45">{secondary}</p>
        </div>
        {badge && (
          <span
            className="hidden max-w-[7rem] truncate rounded-full border border-white/10 px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase sm:inline"
            style={badgeStyle}
          >
            {badge}
          </span>
        )}
        {props.playing && (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f0b429]/70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-[#f0b429]" />
          </span>
        )}
      </button>

      <PlaybackControls {...props} compact />

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 shrink-0 border-white/10 bg-white/5 text-white hover:bg-white/10"
        aria-label={props.expanded ? "Collapse studio panel" : "Expand studio panel"}
        onClick={props.onToggle}
      >
        <ChevronUp className={`transition-transform ${props.expanded ? "rotate-180" : ""}`} />
      </Button>
    </div>
  );
}

function PlaybackControls(
  props: StudioSheetProps & { compact?: boolean },
) {
  const isOrrery = props.studioModel === "orrery";
  const loopActive = isOrrery ? props.loopYear : props.loopDay;
  const loopLabel = isOrrery
    ? props.loopYear
      ? "Year loop on"
      : "Year loop off"
    : props.loopDay
      ? "Day loop on"
      : "Day loop off";
  const onLoop = isOrrery ? () => props.onLoopYear(!props.loopYear) : () => props.onLoopDay(!props.loopDay);
  const speedLabel = isOrrery ? props.orrerySpeed.label : props.astrolabeSpeed.label;
  const onSpeed = isOrrery
    ? () => props.onOrrerySpeed(nextOrreryPlaybackSpeed(props.orrerySpeed))
    : () => props.onAstrolabeSpeed(nextPlaybackSpeed(props.astrolabeSpeed));

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-10 border-white/10 bg-white/5 text-white hover:bg-white/10"
        aria-pressed={props.playing}
        aria-label={props.playing ? "Pause" : "Play"}
        onClick={() => props.onPlaying(!props.playing)}
      >
        {props.playing ? <Pause /> : <Play />}
      </Button>
      {!props.compact && (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={`size-10 border-white/10 bg-white/5 text-white hover:bg-white/10 ${loopActive ? "border-[#f0b429]/40 bg-[#f0b429]/15 text-[#f0b429]" : ""}`}
            aria-pressed={loopActive}
            aria-label={loopLabel}
            onClick={onLoop}
          >
            <Repeat className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 gap-1 border-white/10 bg-white/5 px-2.5 font-mono text-xs text-white/85 hover:bg-white/10"
            aria-label={`Playback speed ${speedLabel}, click to cycle`}
            onClick={onSpeed}
          >
            <Gauge className="size-3.5" />
            {speedLabel}
          </Button>
        </>
      )}
    </div>
  );
}

function PageDots({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 pb-2.5" role="tablist" aria-label="Panel sections">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === current}
          aria-label={`Section ${i + 1} of ${count}`}
          onClick={() => onSelect(i)}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-4 bg-[#f0b429]" : "w-1.5 bg-white/25 hover:bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}

function AstrolabeTimelinePage(props: StudioSheetProps & { tone: ChromeTone }) {
  const showNowMarker = useSyncExternalStore(subscribeNoop, () => true, () => false);
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
  const meanLabel = formatMinutes(props.minutes);
  const realtime = props.realtime ?? props.astrolabeSpeed.realtime;
  const primaryLabel = realtime && civilClock ? civilClock : meanLabel;
  const meanSolarNote =
    realtime && civilClock ? `${meanLabel} mean solar` : civilTime ? `${civilTime} civil` : null;
  const trackStyle = useMemo(
    () => phaseTrackStyle(props.samples, props.times, props.longitude, props.tone, DAY_MINUTES),
    [props.samples, props.times, props.longitude, props.tone],
  );
  const nowOffset = useMemo(() => {
    if (!showNowMarker) return undefined;
    const now = clockFromInstant(new Date(), props.longitude);
    if (!isSameSolarDay(now, { year: props.year, dayIndex: props.dayIndex })) return undefined;
    return now.minutes;
  }, [showNowMarker, props.longitude, props.year, props.dayIndex]);
  const minutes = Math.min(Math.max(props.minutes, 0), DAY_MINUTES);

  return (
    <section className="space-y-2" aria-label="Timeline">
      <SectionLabel>Timeline</SectionLabel>
      {props.showSun && (
        <p className="text-xs" style={{ color: phaseLabelColor(props.sun.lightingPhase.id, props.tone) }}>
          {props.sun.lightingPhase.label}
        </p>
      )}
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
      <AltitudeSparkline
        samples={props.samples}
        minutes={minutes}
        showSun={props.showSun}
        showMoon={props.showMoon}
        tone={props.tone}
        rangeMinutes={DAY_MINUTES}
        nowOffset={nowOffset}
      />
      <div className="flex justify-between px-0.5 font-mono text-[10px] tracking-wide text-white/35">
        <span>{formatMinutes(0)}</span>
        <span>{formatMinutes(DAY_MINUTES / 2)}</span>
        <span>{formatMinutes(0)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TimeBadge label={realtime && civilClock ? "wall" : "mean"} value={primaryLabel} />
        {meanSolarNote && <TimeBadge label="note" value={meanSolarNote} />}
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
      <CollapsiblePlayback {...props} />
    </section>
  );
}

function OrreryTimelinePage(props: StudioSheetProps & { tone: ChromeTone }) {
  const minutes = Math.min(Math.max(props.minutes, 0), DAY_MINUTES);
  const meanLabel = formatMinutes(props.minutes);

  return (
    <section className="space-y-2" aria-label="Orbital timeline">
      <SectionLabel>Orbital year</SectionLabel>
      <Slider
        min={0}
        max={Math.max(0, props.dayCount - 1)}
        step={1}
        value={[props.dayIndex]}
        onValueChange={([value]) => props.onDayIndex(value)}
        aria-label="Day of year"
      />
      <OrbitalSparkline
        samples={props.orbitalSamples}
        dayIndex={props.dayIndex}
        dayCount={props.dayCount}
        tone={props.tone}
      />
      <div className="flex justify-between px-0.5 font-mono text-[10px] tracking-wide text-white/35">
        <span>Jan 1</span>
        <span>Jul 1</span>
        <span>Dec 31</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TimeBadge label="time (Moon)" value={meanLabel} />
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
      <CollapsiblePlayback {...props} />
    </section>
  );
}

function CollapsiblePlayback(props: StudioSheetProps) {
  const [open, setOpen] = useState(false);
  const isOrrery = props.studioModel === "orrery";
  const loopActive = isOrrery ? props.loopYear : props.loopDay;

  return (
    <div className="rounded-xl border border-white/8 bg-black/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[10px] tracking-[0.16em] text-white/45 uppercase">Playback</span>
        <span className="font-mono text-[11px] text-white/55">
          {isOrrery ? props.orrerySpeed.label : props.astrolabeSpeed.label}
          {loopActive ? " · loop" : ""}
        </span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-3 py-2">
          <PlaybackControls {...props} />
        </div>
      )}
    </div>
  );
}

function AstrolabeReadingsPage(
  props: StudioSheetProps & { tone: ChromeTone; onResetView: () => void },
) {
  const location = locationLabel(props.latitude, props.longitude);
  const dateLabel = formatLongDate(props.model.date);
  const seek = (instant: Date | null) => seekMinute(instant, props.model.date, props.longitude);

  return (
    <section className="space-y-3" aria-label="Readings">
      <SectionLabel>Readings</SectionLabel>

      <CollapsibleSection title="Location & date" defaultOpen>
        <div className="flex items-center gap-2 text-white/70">
          <MapPin className="size-3.5 shrink-0 text-[#f0b429]" />
          <span className="truncate text-xs tracking-[0.12em] uppercase">{location}</span>
        </div>
        <p className="mt-1 text-[11px] text-white/45">{dateLabel}</p>
      </CollapsibleSection>

      {props.showSun && (
        <CollapsibleSection title="Sun" defaultOpen>
          <MetricRow icon={<Compass className="size-3.5" />} label="Azimuth" value={formatAzimuth(props.sun.azimuth)} />
          <MetricRow
            icon={<SunMedium className="size-3.5" />}
            label="Altitude"
            value={formatDegrees(props.sun.altitude)}
            highlight={props.sun.aboveHorizon}
          />
          <div className="mt-2 grid grid-cols-3 gap-1">
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
        </CollapsibleSection>
      )}

      {props.showMoon && (
        <CollapsibleSection title="Moon" defaultOpen={!props.showSun}>
          <MetricRow icon={<Compass className="size-3.5" />} label="Azimuth" value={formatAzimuth(props.moon.azimuth)} />
          <MetricRow
            icon={<Moon className="size-3.5" />}
            label="Altitude"
            value={formatDegrees(props.moon.altitude)}
            highlight={props.moon.aboveHorizon}
          />
          <p className="mt-1 text-[11px] text-white/55">
            {props.moon.phaseLabel} · {Math.round(props.moon.fraction * 100)}% lit
          </p>
        </CollapsibleSection>
      )}

      <button
        type="button"
        onClick={props.onResetView}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] tracking-[0.14em] text-white/60 uppercase hover:bg-white/10"
      >
        <RotateCcw className="size-3.5" />
        Reset camera
      </button>
    </section>
  );
}

function OrreryReadingsPage(props: StudioSheetProps & { tone: ChromeTone }) {
  const focusBody =
    bodyById(props.orreryModel, props.focusPlanet) ?? bodyById(props.orreryModel, "earth");
  const dateLabel = formatLongDate(props.orreryModel.instant);

  if (!focusBody) return null;

  return (
    <section className="space-y-3" aria-label="Orbital readings">
      <SectionLabel>Focus body</SectionLabel>

      <CollapsibleSection title={focusBody.name} defaultOpen>
        <p className="text-[11px] text-white/45">{dateLabel}</p>
        <div className="mt-2 space-y-1.5">
          <MetricRow icon={<Compass className="size-3.5" />} label="Longitude" value={formatDegrees(focusBody.heliocentricLongitudeDeg)} />
          <MetricRow icon={<SunMedium className="size-3.5" />} label="Distance" value={formatAu(focusBody.distanceAu)} />
          <MetricRow icon={<SunMedium className="size-3.5" />} label="Orbit" value={formatOrbitalPhase(focusBody.orbitalPhase)} />
          <MetricRow icon={<SunMedium className="size-3.5" />} label="Season" value={formatEarthSeason(props.orreryModel.earthSeason)} />
        </div>
      </CollapsibleSection>

      {props.focusPlanet === "moon" && props.showMoon && (
        <CollapsibleSection title="Moon phase">
          <p className="text-[11px] text-white/55">
            {props.moon.phaseLabel} · {Math.round(props.moon.fraction * 100)}% lit
          </p>
        </CollapsibleSection>
      )}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.18em] text-white/40 uppercase">{children}</p>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/8 bg-black/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[11px] tracking-[0.12em] text-white/70 uppercase">{title}</span>
        <ChevronUp className={`size-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-1 border-t border-white/8 px-3 py-2">{children}</div>}
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
      <span className="flex items-center gap-1.5 text-white/45">
        <span className="text-[#f0b429]">{icon}</span>
        {label}
      </span>
      <span className={highlight ? "text-[#ffd78a]" : "text-[#f7f3ea]"}>{value}</span>
    </div>
  );
}

function TimeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
      <span className="font-mono text-xs text-white/85 tabular-nums">{value}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
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
  const className = "flex min-h-10 min-w-0 flex-1 flex-col justify-center rounded-lg px-1 text-left hover:bg-white/5";
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

function clickSeek(minute: number | null, onMinutes: (value: number) => void) {
  if (minute === null) return undefined;
  return () => onMinutes(minute);
}

function riseLabel(model: SolarModel, longitude: number, which: "sunrise" | "sunset"): string {
  if (model.times.alwaysUp) return which === "sunrise" ? "Up all day" : "No set";
  if (model.times.alwaysDown) return which === "sunrise" ? "No rise" : "Down all day";
  return formatMeanTime(model.times[which], longitude);
}
