import { parseStudioTheme, type StudioTheme } from "./studio-view";

export const STUDIO_THEME_STORAGE_KEY = "solstice:studio-theme";

const themeListeners = new Set<() => void>();

export function subscribeStudioTheme(onChange: () => void): () => void {
  themeListeners.add(onChange);
  return () => themeListeners.delete(onChange);
}

function notifyStudioTheme() {
  themeListeners.forEach((listener) => listener());
}

export function readStudioThemePreference(): StudioTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STUDIO_THEME_STORAGE_KEY);
    if (value === null) return null;
    return parseStudioTheme(value);
  } catch {
    return null;
  }
}

export function writeStudioThemePreference(theme: StudioTheme): void {
  try {
    window.localStorage.setItem(STUDIO_THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing or blocked storage — in-memory only for this session.
  }
  notifyStudioTheme();
}

export function resolveInitialStudioTheme(urlTheme?: StudioTheme): StudioTheme {
  if (urlTheme !== undefined) return urlTheme;
  return readStudioThemePreference() ?? "default";
}
