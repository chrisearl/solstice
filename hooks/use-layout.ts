"use client";

import { useEffect, useState } from "react";
import {
  computeLayoutInsets,
  defaultInspectorState,
  getBreakpoint,
  inspectorPinnedByDefault,
  type Breakpoint,
  type InspectorState,
  type LayoutConfig,
  type LayoutInsets,
} from "@/lib/layout-insets";

export function useLayout(
  inspectorState: InspectorState,
  inspectorPinned: boolean,
  sheetExpanded = false,
) {
  const [size, setSize] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const breakpoint = getBreakpoint(size.width);
  const config: LayoutConfig = { breakpoint, inspectorState, inspectorPinned, sheetExpanded };
  const insets = computeLayoutInsets(size.width, size.height, config);

  return { breakpoint, insets, width: size.width, height: size.height };
}

export function useInspectorLayout() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [inspectorState, setInspectorState] = useState<InspectorState>("open");
  const [inspectorPinned, setInspectorPinned] = useState(true);

  useEffect(() => {
    const apply = (next: Breakpoint, resetHandheld: boolean) => {
      setBreakpoint(next);
      if (inspectorPinnedByDefault(next)) {
        setInspectorPinned(true);
        setInspectorState("open");
      } else if (resetHandheld) {
        setInspectorPinned(false);
        setInspectorState(defaultInspectorState(next));
      }
    };
    apply(getBreakpoint(window.innerWidth), true);
    const onResize = () => apply(getBreakpoint(window.innerWidth), false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const inspectorOpen =
    inspectorState !== "closed" || (inspectorPinned && (breakpoint === "desktop" || breakpoint === "large"));

  const toggleInspector = () => {
    setInspectorState((state) => (state === "closed" ? "open" : "closed"));
  };

  const closeInspector = () => {
    if (inspectorPinned && (breakpoint === "desktop" || breakpoint === "large")) return;
    setInspectorState("closed");
  };

  return {
    breakpoint,
    inspectorState,
    inspectorPinned,
    inspectorOpen,
    setInspectorState,
    toggleInspector,
    closeInspector,
  };
}

export type { LayoutInsets, InspectorState };
