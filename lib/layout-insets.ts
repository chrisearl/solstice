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
  desktop: 360,
  large: 400,
} as const;

const STAT_RAIL_WIDTH = {
  desktop: 220,
  large: 240,
} as const;

const HUD_TOP = {
  tablet: 96,
  desktop: 56,
  large: 56,
} as const;

/** iPhone 16 Pro portrait: dynamic island plus one viewfinder bar. */
const MOBILE_FINDER_TOP = 120;
/** Finder bar plus the extended readings strip. */
const MOBILE_EXTENDED_TOP = 300;
/** Clears the bottom view switcher and the home indicator. */
const MOBILE_DOCK_BOTTOM = 132;

const INSPECTOR_PEEK = 72;
const INSPECTOR_OPEN_RATIO = 0.52;

export function computeLayoutInsets(
  width: number,
  height: number,
  config: LayoutConfig,
): LayoutInsets {
  const { breakpoint, inspectorState, inspectorPinned } = config;

  if (breakpoint === "mobile") {
    const extended = Boolean(config.readingsOpen) && inspectorState === "closed";
    const top = extended ? MOBILE_EXTENDED_TOP : MOBILE_FINDER_TOP;
    let bottom = MOBILE_DOCK_BOTTOM;
    if (inspectorState === "peek") bottom = INSPECTOR_PEEK + 108;
    if (inspectorState === "open") {
      bottom = Math.min(height * INSPECTOR_OPEN_RATIO, 420) + 64;
    }
    return { left: 16, right: 16, top, bottom };
  }

  if (breakpoint === "tablet") {
    const top = HUD_TOP.tablet;
    const left =
      inspectorPinned || inspectorState === "open"
        ? INSPECTOR_WIDTH.tablet + 16
        : 16;
    return { left, right: 16, top, bottom: 16 };
  }

  const inspectorWidth = INSPECTOR_WIDTH[breakpoint];
  const statWidth = STAT_RAIL_WIDTH[breakpoint === "large" ? "large" : "desktop"];
  const top = HUD_TOP[breakpoint];

  return {
    left: inspectorPinned ? inspectorWidth + 20 : 20,
    right: statWidth + 24,
    top,
    bottom: 20,
  };
}

export function defaultInspectorState(breakpoint: Breakpoint): InspectorState {
  if (breakpoint === "desktop" || breakpoint === "large") return "open";
  return "closed";
}

export function inspectorPinnedByDefault(breakpoint: Breakpoint): boolean {
  return breakpoint === "desktop" || breakpoint === "large";
}
