"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeviceOrientationState =
  | { status: "idle" }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "active"; heading: number };

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const SMOOTHING = 0.15;

function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
}

function readHeading(event: DeviceOrientationEventWithCompass): number | null {
  if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading);
  }
  if (event.absolute && typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return normalizeHeading(event.alpha);
  }
  return null;
}

export function isDeviceOrientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

export async function requestDeviceOrientationPermission(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (!isDeviceOrientationSupported()) return "unsupported";

  const ctor = DeviceOrientationEvent as DeviceOrientationEventConstructor;
  if (typeof ctor.requestPermission !== "function") return "granted";

  try {
    const result = await ctor.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export function useDeviceOrientation(enabled: boolean) {
  const [state, setState] = useState<DeviceOrientationState>(() =>
    isDeviceOrientationSupported() ? { status: "idle" } : { status: "unsupported" },
  );
  const smoothedHeading = useRef<number | null>(null);

  const reset = useCallback(() => {
    smoothedHeading.current = null;
    setState(isDeviceOrientationSupported() ? { status: "idle" } : { status: "unsupported" });
  }, []);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    if (!isDeviceOrientationSupported()) {
      setState({ status: "unsupported" });
      return;
    }

    const onOrientation = (event: Event) => {
      const heading = readHeading(event as DeviceOrientationEventWithCompass);
      if (heading === null) return;

      const previous = smoothedHeading.current;
      const next =
        previous === null
          ? heading
          : normalizeHeading(previous + shortestAngleDelta(previous, heading) * SMOOTHING);

      smoothedHeading.current = next;
      setState({ status: "active", heading: next });
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [enabled, reset]);

  const markDenied = useCallback(() => {
    smoothedHeading.current = null;
    setState({ status: "denied" });
  }, []);

  return { state, markDenied, reset };
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}
