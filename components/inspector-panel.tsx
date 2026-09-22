"use client";

import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlPanel } from "@/components/control-panel";
import type { Breakpoint, InspectorState } from "@/lib/layout-insets";
import type { MoonModel, MoonPlacement, SolarModel, SunPlacement } from "@/lib/solar";

interface InspectorPanelProps {
  breakpoint: Breakpoint;
  state: InspectorState;
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
  onClose: () => void;
  onPeek: () => void;
  onOpen: () => void;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const { breakpoint, state } = props;
  if (state === "closed") return null;

  const panelProps = {
    model: props.model,
    moonModel: props.moonModel,
    sun: props.sun,
    moon: props.moon,
    latitude: props.latitude,
    longitude: props.longitude,
    latText: props.latText,
    lngText: props.lngText,
    minutes: props.minutes,
    playing: props.playing,
    dayIndex: props.dayIndex,
    dayCount: props.dayCount,
    showSun: props.showSun,
    showMoon: props.showMoon,
    onLatText: props.onLatText,
    onLngText: props.onLngText,
    onPreset: props.onPreset,
    onDayIndex: props.onDayIndex,
    onDate: props.onDate,
    onMinutes: props.onMinutes,
    onPlaying: props.onPlaying,
    onJump: props.onJump,
    onShowSun: props.onShowSun,
    onShowMoon: props.onShowMoon,
    onResetView: props.onResetView,
    onResetPlace: props.onResetPlace,
    compactHeader: true as const,
  };

  if (breakpoint === "mobile") {
    return (
      <>
        <button
          type="button"
          aria-label="Close inspector"
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px]"
          onClick={props.onClose}
        />
        <aside
          className={`fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,10,16,0.94))] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[max-height] duration-300 ease-out motion-reduce:transition-none ${
            state === "peek" ? "max-h-[4.5rem]" : "max-h-[min(52dvh,28rem)]"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <SheetHeader
            onClose={props.onClose}
            onToggleExpand={state === "peek" ? props.onOpen : props.onPeek}
            expanded={state === "open"}
          />
          <div
            className={`panel-scroll overflow-y-auto px-4 pb-4 ${state === "peek" ? "hidden" : "block"}`}
          >
            <ControlPanel {...panelProps} />
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close inspector"
        className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px]"
        onClick={props.onClose}
      />
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-[min(340px,88vw)] flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,10,16,0.92))] shadow-[24px_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none md:w-[min(360px,40vw)] ${
          state === "open" ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <DrawerHeader onClose={props.onClose} />
        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5">
          <ControlPanel {...panelProps} />
        </div>
      </aside>
    </>
  );
}

function SheetHeader({
  onClose,
  onToggleExpand,
  expanded,
}: {
  onClose: () => void;
  onToggleExpand: () => void;
  expanded: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse inspector" : "Expand inspector"}
      >
        <span className="h-1 w-10 rounded-full bg-white/25" />
        <span className="text-[11px] tracking-[0.16em] text-white/45 uppercase">Inspector</span>
        {!expanded && (
          <span className="text-xs text-white/55">Location, date, time, and sky layers</span>
        )}
      </button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-11 border-white/10 bg-white/5 text-white hover:bg-white/10"
        aria-label="Close inspector"
        onClick={onClose}
      >
        <X />
      </Button>
    </div>
  );
}

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
      <div>
        <p className="font-display text-2xl text-[#f6f1e7]">Inspector</p>
        <p className="text-xs text-white/45">Location, date, time, and sky layers</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        aria-label="Close inspector"
        onClick={onClose}
      >
        <ChevronDown className="md:hidden" />
        <X className="hidden md:block" />
      </Button>
    </div>
  );
}
