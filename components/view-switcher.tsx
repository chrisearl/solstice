"use client";

import { Globe2, Maximize2, Minimize2, Orbit, Palette } from "lucide-react";
import type { StudioModel, StudioTheme, StudioView } from "@/lib/studio-view";

interface ViewSwitcherProps {
  view: StudioView;
  fullscreen: boolean;
  davinciUnlocked?: boolean;
  onModel: (model: StudioModel) => void;
  onTheme: (theme: StudioTheme) => void;
  onFullscreen: () => void;
  /** When true, renders in normal flow (e.g. above the stat rail) instead of fixed top-right. */
  inline?: boolean;
  className?: string;
}

function toggleClass(parchment: boolean, active: boolean): string {
  const base = parchment
    ? "flex h-11 items-center gap-2 rounded-full border px-3.5 shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2"
    : "flex h-11 items-center gap-2 rounded-full border px-3.5 shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2";
  if (parchment) {
    return active
      ? `${base} border-[#5c3b1e]/60 bg-[#e8d4b4] text-[#3a2310] shadow-[#422d1b]/20 focus-visible:ring-[#5c3b1e]`
      : `${base} border-[#9b764b]/50 bg-[#f4e8d1]/92 text-[#3a2310]/70 shadow-[#422d1b]/20 hover:bg-[#efe2cc] focus-visible:ring-[#5c3b1e]`;
  }
  return active
    ? `${base} border-[#f0b429]/40 bg-white/15 text-white shadow-black/30 focus-visible:ring-[#f0b429]`
    : `${base} border-white/10 bg-black/55 text-white/70 shadow-black/30 hover:bg-white/10 focus-visible:ring-[#f0b429]`;
}

export function ViewSwitcher({
  view,
  fullscreen,
  davinciUnlocked = false,
  onModel,
  onTheme,
  onFullscreen,
  inline = false,
  className = "",
}: ViewSwitcherProps) {
  const parchment = view.theme === "davinci";

  const positionClass = inline
    ? "relative z-auto flex flex-wrap items-center justify-end gap-1.5"
    : "pointer-events-auto fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-3 z-50 flex flex-wrap items-center justify-end gap-1.5 md:right-4 lg:right-5";

  return (
    <div className={`${positionClass} ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Switch to astrolabe view"
          aria-pressed={view.model === "astrolabe"}
          onClick={() => onModel("astrolabe")}
          className={toggleClass(parchment, view.model === "astrolabe")}
        >
          <Globe2 className="size-4 shrink-0" />
          <span className="text-[11px] tracking-[0.12em] uppercase">Astrolabe</span>
        </button>
        <button
          type="button"
          aria-label="Switch to orrery view"
          aria-pressed={view.model === "orrery"}
          onClick={() => onModel("orrery")}
          className={toggleClass(parchment, view.model === "orrery")}
        >
          <Orbit className="size-4 shrink-0" />
          <span className="text-[11px] tracking-[0.12em] uppercase">Orrery</span>
        </button>
      </div>

      {davinciUnlocked && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Switch to night sky theme"
            aria-pressed={view.theme === "default"}
            onClick={() => onTheme("default")}
            className={toggleClass(parchment, view.theme === "default")}
          >
            <span className="text-[11px] tracking-[0.12em] uppercase">Night</span>
          </button>
          <button
            type="button"
            aria-label="Switch to Da Vinci theme"
            aria-pressed={view.theme === "davinci"}
            onClick={() => onTheme("davinci")}
            className={toggleClass(parchment, view.theme === "davinci")}
          >
            <Palette className="size-4 shrink-0" />
            <span className="text-[11px] tracking-[0.12em] uppercase">Da Vinci</span>
          </button>
        </div>
      )}

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

export type { StudioModel, StudioTheme, StudioView };
