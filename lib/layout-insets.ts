export type Breakpoint = "mobile" | "tablet" | "desktop" | "large";

export type InspectorState = "closed" | "peek" | "open";

export interface LayoutInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LayoutConfig {
  breakpoint: Breakpoint;
  inspectorState: InspectorState;
  inspectorPinned: boolean;
  /** Mobile portrait readings strip. Ignored while the inspector covers the frame. */
  readingsOpen?: boolean;
}

const MD = 768;
const LG = 1024;
const XL = 1536;

export function getBreakpoint(width: number): Breakpoint {
  if (width < MD) return "mobile";
  if (width < LG) return "tablet";
  if (width < XL) return "desktop";
  return "large";
}

const INSPECTOR_WIDTH = {
  tablet: 340,
  desktop: 340,
  large: 380,
} as const;

const STAT_RAIL_WIDTH = {
  desktop: 220,
  large: 240,
} as const;

const HUD_TOP = {
  tablet: 96,
  desktop: 52,
  large: 52,
} as const;

/** iPhone portrait: dynamic island plus one viewfinder bar. */
const MOBILE_FINDER_TOP = 120;
/** Finder bar plus the extended readings strip. */
const MOBILE_EXTENDED_TOP = 300;
/** View switcher row below the HUD on mobile and tablet. */
const VIEW_SWITCHER_ROW = 52;

/** Shared top offset for pinned side panels and chrome (clears window controls). */
export const STUDIO_CHROME_TOP_CLASS =
  "top-[max(1rem,calc(0.625rem+env(safe-area-inset-top,0px)))]";

const INSPECTOR_PEEK = 72;
const INSPECTOR_OPEN_RATIO = 0.52;
/** Collapsed timeline: header row + altitude sparkline + padding. */
export const TIMELINE_PEEK_HEIGHT = 116;
const TIMELINE_PEEK = TIMELINE_PEEK_HEIGHT;

export function computeLayoutInsets(
  width: number,
  height: number,
  config: LayoutConfig,
): LayoutInsets {
  const { breakpoint, inspectorState, inspectorPinned } = config;

  if (breakpoint === "mobile") {
    const extended = Boolean(config.readingsOpen) && inspectorState === "closed";
    const top =
      (extended ? MOBILE_EXTENDED_TOP : MOBILE_FINDER_TOP) + VIEW_SWITCHER_ROW;
    let bottom = TIMELINE_PEEK + 12;
    if (inspectorState === "peek") bottom = INSPECTOR_PEEK + TIMELINE_PEEK + 8;
    if (inspectorState === "open") {
      bottom = Math.min(height * INSPECTOR_OPEN_RATIO, 420) + TIMELINE_PEEK + 8;
    }
    return { left: 12, right: 12, top, bottom };
  }

  if (breakpoint === "tablet") {
    const top = HUD_TOP.tablet + VIEW_SWITCHER_ROW;
    const left =
      inspectorPinned || inspectorState === "open"
        ? INSPECTOR_WIDTH.tablet + 16
        : 16;
    return { left, right: 16, top, bottom: TIMELINE_PEEK + 16 };
  }

  const inspectorWidth = INSPECTOR_WIDTH[breakpoint];
  const statWidth = STAT_RAIL_WIDTH[breakpoint === "large" ? "large" : "desktop"];
  const top = HUD_TOP[breakpoint];

  return {
    left: inspectorPinned ? inspectorWidth + 20 : 20,
    right: statWidth + 24,
    top,
    bottom: TIMELINE_PEEK + 20,
  };
}

export function defaultInspectorState(breakpoint: Breakpoint): InspectorState {
  if (breakpoint === "desktop" || breakpoint === "large") return "open";
  return "closed";
}

export function inspectorPinnedByDefault(breakpoint: Breakpoint): boolean {
  return breakpoint === "desktop" || breakpoint === "large";
}
