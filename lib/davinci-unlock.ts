export const DAVINCI_UNLOCK_STORAGE_KEY = "solstice:davinci-unlocked";

/** Classic Konami sequence ending with B, then A. */
export const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

export type KonamiStep = (typeof KONAMI_SEQUENCE)[number];

export const KONAMI_STEP_TIMEOUT_MS = 4000;
export const KONAMI_SWIPE_MIN_PX = 36;
export const KONAMI_TAP_SLOP_PX = 14;

export function readDavinciUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DAVINCI_UNLOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDavinciUnlocked(): void {
  try {
    window.localStorage.setItem(DAVINCI_UNLOCK_STORAGE_KEY, "1");
  } catch {
    // Private browsing or blocked storage — unlock for this session only.
  }
}

export function keyToKonamiStep(key: string): KonamiStep | null {
  switch (key) {
    case "ArrowUp":
      return "ArrowUp";
    case "ArrowDown":
      return "ArrowDown";
    case "ArrowLeft":
      return "ArrowLeft";
    case "ArrowRight":
      return "ArrowRight";
    case "a":
    case "A":
      return "a";
    case "b":
    case "B":
      return "b";
    default:
      return null;
  }
}

export function advanceKonamiSequence(
  index: number,
  step: KonamiStep,
): { index: number; complete: boolean } {
  const expected = KONAMI_SEQUENCE[index];
  if (step === expected) {
    const next = index + 1;
    if (next >= KONAMI_SEQUENCE.length) {
      return { index: 0, complete: true };
    }
    return { index: next, complete: false };
  }

  if (step === KONAMI_SEQUENCE[0]) {
    return { index: 1, complete: false };
  }
  return { index: 0, complete: false };
}

export function swipeToKonamiStep(dx: number, dy: number): KonamiStep | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < KONAMI_SWIPE_MIN_PX) return null;
  if (absX > absY) {
    return dx > 0 ? "ArrowRight" : "ArrowLeft";
  }
  return dy > 0 ? "ArrowDown" : "ArrowUp";
}

/** Left half of the screen = A, right half = B. */
export function tapToKonamiStep(clientX: number, viewportWidth: number): "a" | "b" {
  return clientX < viewportWidth / 2 ? "a" : "b";
}

export function isKonamiButtonStep(step: KonamiStep | undefined): step is "a" | "b" {
  return step === "a" || step === "b";
}

export function isKonamiInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") {
    return true;
  }
  return target.isContentEditable || Boolean(target.closest("[contenteditable='true']"));
}
