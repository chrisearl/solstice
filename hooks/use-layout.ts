"use client";

import { useEffect, useState } from "react";
import {
  computeLayoutInsets,
  defaultInspectorState,
  getBreakpoint,
  inspectorPinnedByDefault,
  type InspectorState,
  type LayoutConfig,
  type LayoutInsets,
} from "@/lib/layout-insets";

export function useLayout(inspectorState: InspectorState, inspectorPinned: boolean) {
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
  const config: LayoutConfig = { breakpoint, inspectorState, inspectorPinned };
  const insets = computeLayoutInsets(size.width, size.height, config);

  return { breakpoint, insets, width: size.width, height: size.height };
}

export function useInspectorLayout() {
  const [breakpoint, setBreakpoint] = useState(() =>
    typeof window === "undefined" ? "desktop" : getBreakpoint(window.innerWidth),
  );
  const [inspectorState, setInspectorState] = useState<InspectorState>(() =>
    typeof window === "undefined" ? "open" : defaultInspectorState(getBreakpoint(window.innerWidth)),
  );
  const [inspectorPinned, setInspectorPinned] = useState(() =>
    typeof window === "undefined" ? true : inspectorPinnedByDefault(getBreakpoint(window.innerWidth)),
  );

  useEffect(() => {
    const update = () => {
      const next = getBreakpoint(window.innerWidth);
      setBreakpoint(next);
      if (inspectorPinnedByDefault(next)) {
        setInspectorPinned(true);
        setInspectorState("open");
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const inspectorOpen =
    inspectorState !== "closed" || (inspectorPinned && (breakpoint === "desktop" || breakpoint === "large"));

  const toggleInspector = () => {
    if (breakpoint === "mobile") {
      setInspectorState((state) => (state === "closed" ? "open" : "closed"));
      return;
    }
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
    setInspectorPinned,
    toggleInspector,
    closeInspector,
  };
}

export type { LayoutInsets, InspectorState };
