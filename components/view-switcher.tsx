"use client";

import { Globe2, Maximize2, Minimize2, Orbit, Settings } from "lucide-react";
import Link from "next/link";
import { chromeIconButtonClass, chromeToggleClass } from "@/lib/chrome-styles";
import type { StudioModel, StudioTheme, StudioView } from "@/lib/studio-view";

interface ViewSwitcherProps {
  view: StudioView;
  fullscreen: boolean;
  settingsHref?: string;
  onModel: (model: StudioModel) => void;
  onFullscreen: () => void;
  /** When true, renders in normal flow (e.g. above the stat rail) instead of fixed top-right. */
  inline?: boolean;
  className?: string;
}

export function ViewSwitcher({
  view,
  fullscreen,
  settingsHref = "/settings",
  onModel,
  onFullscreen,
  inline = false,
  className = "",
}: ViewSwitcherProps) {
  const sepiaInk = view.theme === "davinci";

  const positionClass = inline
    ? "relative z-auto flex flex-wrap items-center justify-end gap-1.5"
    : [
        "pointer-events-auto fixed inset-x-3 z-40 flex items-center justify-end gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "top-[calc(3.25rem+env(safe-area-inset-top,0px))] md:inset-x-4 md:top-[calc(6.25rem+env(safe-area-inset-top,0px))]",
      ].join(" ");

  return (
    <div className={`${positionClass} ${className}`}>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Switch to astrolabe view"
          aria-pressed={view.model === "astrolabe"}
          onClick={() => onModel("astrolabe")}
          className={chromeToggleClass(sepiaInk, view.model === "astrolabe")}
        >
          <Globe2 className="size-4 shrink-0" />
          <span className="text-[11px] tracking-[0.12em] uppercase">Astrolabe</span>
        </button>
        <button
          type="button"
          aria-label="Switch to orrery view"
          aria-pressed={view.model === "orrery"}
          onClick={() => onModel("orrery")}
          className={chromeToggleClass(sepiaInk, view.model === "orrery")}
        >
          <Orbit className="size-4 shrink-0" />
          <span className="text-[11px] tracking-[0.12em] uppercase">Orrery</span>
        </button>
      </div>

      <Link
        href={settingsHref}
        aria-label="Open settings"
        className={chromeIconButtonClass(sepiaInk)}
      >
        <Settings className="size-4" />
      </Link>

      <button
        type="button"
        aria-pressed={fullscreen}
        aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
        onClick={onFullscreen}
        className={chromeIconButtonClass(sepiaInk)}
      >
        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );
}

export type { StudioModel, StudioTheme, StudioView };
