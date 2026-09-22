"use client";

import { Maximize2, Minimize2, Palette } from "lucide-react";

export type StudioView = "default" | "davinci";

interface ViewSwitcherProps {
  view: StudioView;
  fullscreen: boolean;
  davinciUnlocked?: boolean;
  onView: (view: StudioView) => void;
  onFullscreen: () => void;
  /** When true, renders in normal flow (e.g. above the stat rail) instead of fixed top-right. */
  inline?: boolean;
  className?: string;
}

export function ViewSwitcher({
  view,
  fullscreen,
  davinciUnlocked = false,
  onView,
  onFullscreen,
  inline = false,
  className = "",
}: ViewSwitcherProps) {
  const parchment = view === "davinci";
  const showDavinciToggle = davinciUnlocked;
  const nextView = view === "default" ? "davinci" : "default";
  const nextLabel = view === "default" ? "Da Vinci" : "Default";

  const positionClass = inline
    ? "relative z-auto flex items-center justify-end gap-1.5"
    : "pointer-events-auto fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-3 z-50 flex items-center gap-1.5 md:right-4 lg:right-5";

  return (
    <div className={`${positionClass} ${className}`}>
      {showDavinciToggle && (
        <button
          type="button"
          aria-label={`Switch to ${nextLabel} view`}
          onClick={() => onView(nextView)}
          className={
            parchment
              ? "flex h-11 items-center gap-2 rounded-full border border-[#9b764b]/50 bg-[#f4e8d1]/92 px-3.5 text-[#3a2310] shadow-lg shadow-[#422d1b]/20 backdrop-blur-md hover:bg-[#efe2cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5c3b1e]"
              : "flex h-11 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3.5 text-white shadow-lg shadow-black/30 backdrop-blur-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]"
          }
        >
          <Palette className="size-4 shrink-0" />
          <span className="text-[11px] tracking-[0.12em] uppercase">{nextLabel}</span>
        </button>
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
