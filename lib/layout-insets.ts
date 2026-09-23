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
  /** Mobile studio sheet open at half the viewport; frames the appliance in the top half. */
  sheetExpanded?: boolean;
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

/** Top chrome: view switcher row + safe area. */
const TOP_CHROME = 56;

/** View switcher row at top of page. */
const VIEW_SWITCHER_ROW = TOP_CHROME;

/** Shared top offset for pinned side panels and chrome (clears window controls). */
export const STUDIO_CHROME_TOP_CLASS =
  "top-[max(1rem,calc(0.625rem+env(safe-area-inset-top,0px)))]";

const INSPECTOR_PEEK = 72;
const INSPECTOR_OPEN_RATIO = 0.52;
/** Closed studio sheet status bar height. */
export const STUDIO_SHEET_CLOSED_HEIGHT = 52;
/** @deprecated Use STUDIO_SHEET_CLOSED_HEIGHT */
export const TIMELINE_PEEK_HEIGHT = STUDIO_SHEET_CLOSED_HEIGHT;
/** Max expanded studio sheet height (px) on tablet. */
export const STUDIO_SHEET_EXPANDED_MAX = 280;
/** Open studio sheet on mobile, as a fraction of the viewport. */
export const STUDIO_SHEET_MOBILE_EXPANDED_RATIO = 0.5;
const SHEET_CLOSED = STUDIO_SHEET_CLOSED_HEIGHT;

export function computeLayoutInsets(
  width: number,
  height: number,
  config: LayoutConfig,
): LayoutInsets {
  const { breakpoint, inspectorState, inspectorPinned } = config;

  const top = VIEW_SWITCHER_ROW + 12;

  if (breakpoint === "mobile") {
    const sheet = config.sheetExpanded ? height * STUDIO_SHEET_MOBILE_EXPANDED_RATIO : SHEET_CLOSED;
    let bottom = sheet + 12;
    if (inspectorState === "peek") bottom = Math.max(bottom, INSPECTOR_PEEK + SHEET_CLOSED + 8);
    if (inspectorState === "open") {
      bottom = Math.max(bottom, Math.min(height * INSPECTOR_OPEN_RATIO, 420) + SHEET_CLOSED + 8);
    }
    return { left: 12, right: 12, top, bottom };
  }

  if (breakpoint === "tablet") {
    const left =
      inspectorPinned || inspectorState === "open"
        ? INSPECTOR_WIDTH.tablet + 16
        : 16;
    return { left, right: 16, top, bottom: SHEET_CLOSED + 16 };
  }

  const inspectorWidth = INSPECTOR_WIDTH[breakpoint];

  return {
    left: inspectorPinned ? inspectorWidth + 20 : 20,
    right: 20,
    top,
    bottom: SHEET_CLOSED + 20,
  };
}

export function defaultInspectorState(breakpoint: Breakpoint): InspectorState {
  if (breakpoint === "desktop" || breakpoint === "large") return "open";
  return "closed";
}

export function inspectorPinnedByDefault(breakpoint: Breakpoint): boolean {
  return breakpoint === "desktop" || breakpoint === "large";
}
