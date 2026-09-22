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
  mobile: 88,
  tablet: 96,
  desktop: 56,
  large: 56,
} as const;

const INSPECTOR_PEEK = 72;
const INSPECTOR_OPEN_RATIO = 0.52;
const TIMELINE_PEEK = 76;

export function computeLayoutInsets(
  width: number,
  height: number,
  config: LayoutConfig,
): LayoutInsets {
  const { breakpoint, inspectorState, inspectorPinned } = config;

  if (breakpoint === "mobile") {
    const top = HUD_TOP.mobile;
    let bottom = TIMELINE_PEEK + 12;
    if (inspectorState === "peek") bottom = INSPECTOR_PEEK + TIMELINE_PEEK + 8;
    if (inspectorState === "open") {
      bottom = Math.min(height * INSPECTOR_OPEN_RATIO, 420) + TIMELINE_PEEK + 8;
    }
    return { left: 12, right: 12, top, bottom };
  }

  if (breakpoint === "tablet") {
    const top = HUD_TOP.tablet;
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
