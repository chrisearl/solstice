"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceKonamiSequence,
  isKonamiButtonStep,
  isKonamiInputTarget,
  KONAMI_SEQUENCE,
  KONAMI_STEP_TIMEOUT_MS,
  KONAMI_TAP_SLOP_PX,
  keyToKonamiStep,
  readDavinciUnlocked,
  swipeToKonamiStep,
  tapToKonamiStep,
  writeDavinciUnlocked,
  type KonamiStep,
} from "@/lib/davinci-unlock";

export function useDavinciUnlock() {
  const [davinciUnlocked, setDavinciUnlocked] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDavinciUnlocked(readDavinciUnlocked());
  }, []);

  const resetSequence = useCallback(() => {
    indexRef.current = 0;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const unlock = useCallback(() => {
    writeDavinciUnlocked();
    setDavinciUnlocked(true);
    resetSequence();
  }, [resetSequence]);

  const scheduleReset = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      indexRef.current = 0;
      timeoutRef.current = null;
    }, KONAMI_STEP_TIMEOUT_MS);
  }, []);

  const submitStep = useCallback(
    (step: KonamiStep) => {
      const result = advanceKonamiSequence(indexRef.current, step);
      indexRef.current = result.index;
      if (result.complete) {
        unlock();
        return;
      }
      scheduleReset();
    },
    [scheduleReset, unlock],
  );

  useEffect(() => {
    if (davinciUnlocked) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isKonamiInputTarget(event.target)) return;
      const step = keyToKonamiStep(event.key);
      if (!step) return;
      event.preventDefault();
      submitStep(step);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isKonamiInputTarget(event.target)) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (isKonamiInputTarget(event.target)) return;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const distance = Math.hypot(dx, dy);
      const expected = KONAMI_SEQUENCE[indexRef.current];

      if (isKonamiButtonStep(expected)) {
        if (distance > KONAMI_TAP_SLOP_PX) return;
        submitStep(tapToKonamiStep(touch.clientX, window.innerWidth));
        return;
      }

      const swipe = swipeToKonamiStep(dx, dy);
      if (swipe) submitStep(swipe);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      resetSequence();
    };
  }, [davinciUnlocked, resetSequence, submitStep]);

  return { davinciUnlocked };
}
