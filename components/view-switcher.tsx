"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import type { Breakpoint, InspectorState } from "@/lib/layout-insets";

export type StudioView = "default" | "davinci";

interface ViewSwitcherProps {
  view: StudioView;
  fullscreen: boolean;
  breakpoint: Breakpoint;
  inspectorState: InspectorState;
  onView: (view: StudioView) => void;
  onFullscreen: () => void;
  className?: string;
}

const VIEWS: { id: StudioView; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "davinci", label: "Da Vinci" },
];

export function ViewSwitcher({
  view,
  fullscreen,
  breakpoint,
  inspectorState,
  onView,
  onFullscreen,
  className = "",
}: ViewSwitcherProps) {
  const parchment = view === "davinci";
  const position = dockPosition({ fullscreen, breakpoint, inspectorState });

  return (
    <div className={`pointer-events-auto absolute z-50 flex items-end gap-1.5 transition-[bottom] duration-300 ease-out motion-reduce:transition-none ${position} ${className}`}>
      <div
        role="radiogroup"
        aria-label="Scene view"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onView(view === "default" ? "davinci" : "default");
        }}
        className={
          parchment
            ? "flex gap-1.5 rounded-2xl border border-[#9b764b]/40 bg-[#f4e8d1]/92 p-1.5 text-[#3a2310] shadow-lg shadow-[#422d1b]/20 backdrop-blur-md"
            : "flex gap-1.5 rounded-2xl border border-white/10 bg-black/55 p-1.5 text-white shadow-lg shadow-black/30 backdrop-blur-md"
        }
      >
        {VIEWS.map((option) => {
          const selected = view === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onView(option.id)}
              className={`flex w-[4.5rem] flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 ${
                parchment ? "focus-visible:ring-[#5c3b1e]" : "focus-visible:ring-[#f0b429]"
              }`}
            >
              <span
                className={`block h-11 w-full overflow-hidden rounded-md border-2 ${
                  selected
                    ? parchment
                      ? "border-[#5c3b1e]"
                      : "border-[#f0b429]"
                    : parchment
                      ? "border-[#9b764b]/25"
                      : "border-white/15"
                }`}
              >
                {option.id === "default" ? <DefaultPreview /> : <DavinciPreview />}
              </span>
              <span
                className={`text-[10px] tracking-[0.14em] uppercase ${
                  selected ? "font-semibold" : "opacity-60"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={fullscreen}
        aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
        onClick={onFullscreen}
        className={
          parchment
            ? "flex size-11 items-center justify-center rounded-full border border-[#9b764b]/50 bg-[#f4e8d1]/92 text-[#3a2310] shadow-lg shadow-[#422d1b]/20 backdrop-blur-md hover:bg-[#efe2cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5c3b1e]"
            : "flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow-lg shadow-black/30 backdrop-blur-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]"
        }
      >
        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );
}

function dockPosition({
  fullscreen,
  breakpoint,
  inspectorState,
}: {
  fullscreen: boolean;
  breakpoint: Breakpoint;
  inspectorState: InspectorState;
}) {
  const base = "left-1/2 -translate-x-1/2";
  if (!fullscreen && breakpoint === "mobile" && inspectorState === "open") {
    return `${base} bottom-[calc(min(52dvh,28rem)+0.75rem)]`;
  }
  if (!fullscreen && breakpoint === "mobile" && inspectorState === "peek") {
    return `${base} bottom-[calc(4.5rem+0.75rem+env(safe-area-inset-bottom))]`;
  }
  return `${base} bottom-[max(1rem,env(safe-area-inset-bottom))]`;
}

function DefaultPreview() {
  return (
    <svg viewBox="0 0 76 44" className="h-full w-full" aria-hidden>
      <rect width="76" height="44" fill="#07080d" />
      <circle cx="14" cy="10" r="0.6" fill="#ffffff" />
      <circle cx="26" cy="7" r="0.45" fill="#ffffff" />
      <circle cx="48" cy="12" r="0.5" fill="#ffffff" />
      <circle cx="64" cy="8" r="0.55" fill="#ffffff" />
      <path
        d="M8 33c8-14 18-20 30-20s22 6 30 20"
        fill="none"
        stroke="#f0b429"
        strokeWidth="1.5"
      />
      <circle cx="55" cy="16" r="2.3" fill="#fff3cf" />
      <ellipse cx="38" cy="35" rx="24" ry="5.5" fill="none" stroke="#8ea0b8" strokeWidth="0.9" />
      <path d="M16 35h44" stroke="#c9844a" strokeWidth="0.7" opacity="0.8" />
    </svg>
  );
}

function DavinciPreview() {
  return (
    <svg viewBox="0 0 76 44" className="h-full w-full" aria-hidden>
      <rect width="76" height="44" fill="#dfcdad" />
      <ellipse cx="38" cy="32" rx="24" ry="6" fill="none" stroke="#6b4a2b" strokeWidth="0.8" />
      <path d="M16 32c6-11 14-15 22-15s16 4 22 15" fill="none" stroke="#3a2412" strokeWidth="0.9" />
      <path
        d="M20 32c4-6 9-9 18-9s14 3 18 9"
        fill="none"
        stroke="#3a2412"
        strokeWidth="0.6"
        strokeDasharray="1.4 1.1"
        opacity="0.75"
      />
      <circle cx="54" cy="20" r="3.1" fill="#e7d4b0" stroke="#3a2412" strokeWidth="0.55" />
      <path d="M52 18.2l4 3.6M56 18.2l-4 3.6" stroke="#3a2412" strokeWidth="0.4" />
      <circle cx="27" cy="24" r="2.2" fill="#e7d4b0" stroke="#3a2412" strokeWidth="0.5" />
    </svg>
  );
}
